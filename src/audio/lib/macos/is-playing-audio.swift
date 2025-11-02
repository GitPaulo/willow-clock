import Foundation
import CoreAudio

struct Output: Codable {
    let playing: Bool
    let sources: [String]
}

func getDefaultOutputDeviceID() -> AudioDeviceID? {
    var deviceID = AudioDeviceID(0)
    var addr = AudioObjectPropertyAddress(
        mSelector: kAudioHardwarePropertyDefaultOutputDevice,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )
    var size = UInt32(MemoryLayout<AudioDeviceID>.size)

    let status = AudioObjectGetPropertyData(
        AudioObjectID(kAudioObjectSystemObject),
        &addr,
        0,
        nil,
        &size,
        &deviceID
    )

    return status == noErr ? deviceID : nil
}

func isDeviceRunning(_ deviceID: AudioDeviceID) -> Bool {
    var running: UInt32 = 0
    var addr = AudioObjectPropertyAddress(
        mSelector: kAudioDevicePropertyDeviceIsRunningSomewhere,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )
    var size = UInt32(MemoryLayout<UInt32>.size)

    let status = AudioObjectGetPropertyData(
        deviceID,
        &addr,
        0,
        nil,
        &size,
        &running
    )

    return status == noErr && running != 0
}

let playing: Bool
if let dev = getDefaultOutputDeviceID() {
    playing = isDeviceRunning(dev)
} else {
    playing = false
}

let result = Output(playing: playing, sources: [])
let encoder = JSONEncoder()

if let data = try? encoder.encode(result),
   let json = String(data: data, encoding: .utf8) {
    print(json)
} else {
    print(#"{"playing":false,"sources":[]}"#)
}
