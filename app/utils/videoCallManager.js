const EventEmitter = require('events')
const log = require('electron-log/main')
const psList = require('ps-list')

class VideoCallManager extends EventEmitter {
    constructor(settings) {
        super()
        this.settings = settings
        this.pauseForVideoCalls = settings.get('pauseForVideoCalls')
        this.videoCallDetectionCheckInterval = settings.get('videoCallDetectionCheckInterval')
        this.timer = null
        this.isInVideoCall = false

        if (this.pauseForVideoCalls) {
            this.start()
        }
    }

    start() {
        this.pauseForVideoCalls = true
        this._checkVideoCall()
        log.info('Stretchly: starting video call monitoring')
    }

    stop() {
        this.pauseForVideoCalls = false
        this.isInVideoCall = false
        clearTimeout(this.timer)
        this.timer = null
        log.info('Stretchly: stopping video call monitoring')
    }

    async _isInVideoCall() {
        if (!this.pauseForVideoCalls) {
            return false
        }

        try {
            // Check for running video call applications
            const runningProcesses = await psList()

            // Common video call applications
            const videoCallApps = [
                'zoom', 'skype', 'teams', 'slack', 'discord', 'meet',
                'webex', 'gotomeeting', 'bluejeans', 'whereby', 'jitsi',
                'facetime', 'hangouts', 'messenger', 'whatsapp', 'telegram',
                'microsoft teams', 'google meet', 'google chrome', 'firefox',
                'safari', 'edge', 'opera', 'brave'
            ]

            // Check if any video call apps are running
            const videoCallProcesses = runningProcesses.filter(process => {
                const processName = (process.name || '').toLowerCase()
                const processCmd = (process.cmd || '').toLowerCase()

                return videoCallApps.some(app =>
                    processName.includes(app) || processCmd.includes(app)
                )
            })

            if (videoCallProcesses.length === 0) {
                return false
            }

            // Platform-specific camera/microphone detection
            if (process.platform === 'darwin') {
                return await this._isVideoCallActiveMac()
            } else if (process.platform === 'win32') {
                return await this._isVideoCallActiveWindows()
            } else if (process.platform === 'linux') {
                return await this._isVideoCallActiveLinux()
            }

            return false
        } catch (error) {
            log.warn('Stretchly: error detecting video call:', error.message)
            return false
        }
    }

    async _isVideoCallActiveMac() {
        try {
            const util = require('node:util')
            const exec = util.promisify(require('node:child_process').exec)

            // Check if camera is being used
            const { stdout } = await exec('lsof | grep -E "(Camera|Microphone|AppleCamera|AVCaptureSession)" | wc -l')
            const cameraUsage = parseInt(stdout.trim())

            if (cameraUsage > 0) {
                return true
            }

            // Alternative check using system_profiler for camera usage
            try {
                const { stdout: cameraInfo } = await exec('system_profiler SPCameraDataType 2>/dev/null | grep -c "Camera"')
                if (parseInt(cameraInfo.trim()) > 0) {
                    // Check if any process is using the camera
                    const { stdout: ps } = await exec('ps aux | grep -i -E "(zoom|skype|teams|meet|facetime|discord|slack)" | grep -v grep | wc -l')
                    return parseInt(ps.trim()) > 0
                }
            } catch (e) {
                // Fallback method failed, continue with other checks
            }

            return false
        } catch (error) {
            return false
        }
    }

    async _isVideoCallActiveWindows() {
        try {
            const util = require('node:util')
            const exec = util.promisify(require('node:child_process').exec)

            // Check for camera/microphone usage on Windows
            const { stdout } = await exec('powershell "Get-Process | Where-Object {$_.ProcessName -match \\"zoom|skype|teams|meet|discord|slack\\"} | Measure-Object | Select-Object -ExpandProperty Count"')
            const processCount = parseInt(stdout.trim())

            if (processCount > 0) {
                // Additional check for camera usage (requires PowerShell and may need admin rights)
                try {
                    const { stdout: deviceInfo } = await exec('powershell "Get-PnpDevice -Class Camera | Where-Object {$_.Status -eq \\"OK\\"} | Measure-Object | Select-Object -ExpandProperty Count"')
                    return parseInt(deviceInfo.trim()) > 0
                } catch (e) {
                    // If camera check fails, assume video call is active if processes are running
                    return true
                }
            }

            return false
        } catch (error) {
            return false
        }
    }

    async _isVideoCallActiveLinux() {
        try {
            const util = require('node:util')
            const exec = util.promisify(require('node:child_process').exec)

            // Check for video/audio devices in use
            const { stdout } = await exec('lsof /dev/video* /dev/snd/* 2>/dev/null | wc -l')
            const deviceUsage = parseInt(stdout.trim())

            if (deviceUsage > 0) {
                // Check if video call processes are running
                const { stdout: ps } = await exec('ps aux | grep -i -E "(zoom|skype|teams|meet|discord|slack)" | grep -v grep | wc -l')
                return parseInt(ps.trim()) > 0
            }

            return false
        } catch (error) {
            return false
        }
    }

    _checkVideoCall() {
        this.timer = setTimeout(async () => {
            const inVideoCall = await this._isInVideoCall()

            if (!this.isInVideoCall && inVideoCall) {
                this.isInVideoCall = true
                log.info('Stretchly: video call detected, pausing breaks')
                this.emit('videoCallStarted')
            }

            if (this.isInVideoCall && !inVideoCall) {
                this.isInVideoCall = false
                log.info('Stretchly: video call ended, resuming breaks')
                this.emit('videoCallFinished')
            }

            // Schedule next check
            if (this.pauseForVideoCalls) {
                this._checkVideoCall()
            }
        }, this.videoCallDetectionCheckInterval)
    }
}

module.exports = VideoCallManager 