import { describe, it, beforeEach, afterEach, vi } from 'vitest'
import { expect } from 'chai'
import Store from 'electron-store'
import { join } from 'path'

const VideoCallManager = require('../app/utils/videoCallManager')

describe('videoCallManager', function () {
    let settings = null
    let videoCallManager = null

    beforeEach(function () {
        settings = new Store({
            name: 'test-settings-videoCallManager',
            defaults: require('../app/utils/defaultSettings')
        })
        settings.set('pauseForVideoCalls', true)
        videoCallManager = new VideoCallManager(settings)
    })

    afterEach(function () {
        videoCallManager.stop()
        videoCallManager = null
    })

    it('should be paused by default', function () {
        videoCallManager.isInVideoCall.should.be.equal(false)
        videoCallManager.pauseForVideoCalls.should.be.equal(true)
    })

    it('should not be running with pauseForVideoCalls: false', () => new Promise((resolve) => {
        settings.set('pauseForVideoCalls', false)
        videoCallManager.stop()
        videoCallManager = null
        videoCallManager = new VideoCallManager(settings)
        videoCallManager.isInVideoCall.should.be.equal(false)
        videoCallManager.pauseForVideoCalls.should.be.equal(false)
        resolve()
    }))

    it('should be running with pauseForVideoCalls: true', () => new Promise((resolve) => {
        settings.set('pauseForVideoCalls', true)
        videoCallManager.stop()
        videoCallManager = null
        videoCallManager = new VideoCallManager(settings)
        videoCallManager.isInVideoCall.should.be.equal(false)
        videoCallManager.pauseForVideoCalls.should.be.equal(true)
        resolve()
    }))

    it('should be running when started and stopped when stopped', function () {
        videoCallManager.stop()
        videoCallManager.start()
        videoCallManager.isInVideoCall.should.be.equal(false)
        videoCallManager.pauseForVideoCalls.should.be.equal(true)

        videoCallManager.stop()
        videoCallManager.pauseForVideoCalls.should.be.equal(false)
        videoCallManager.isInVideoCall.should.be.equal(false)
    })

    it('should detect video call status', async function () {
        const result = await videoCallManager._isInVideoCall()
        expect(result).to.be.a('boolean')
    })

    it('should have a timer when monitoring', function () {
        videoCallManager.start()
        expect(videoCallManager.timer).to.not.be.null
        videoCallManager.stop()
        expect(videoCallManager.timer).to.be.null
    })

    afterEach(function () {
        videoCallManager.stop()
        videoCallManager = null
    })
}) 