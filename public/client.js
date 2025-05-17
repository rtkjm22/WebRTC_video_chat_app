const socket = io('http://localhost:3000')

// ビデオ領域
const localVideo = document.getElementById('localVideo')
const remoteVideo = document.getElementById('remoteVideo')

// 各種設定項目
const constraints = { video: true, audio: true }
const peerConnections = {}
const configuration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
}

navigator.mediaDevices
  .getUserMedia(constraints)
  .then((stream) => {
    localVideo.srcObject = stream

    // 自分自身が参加した場合のイベント
    socket.on('user-joined', (userId) => {
      if (!peerConnections[userId]) {
        // STUNサーバーを通して、自分のグローバルIPアドレスとポート番号を取得
        const peerConnection = new RTCPeerConnection(configuration)
        peerConnections[userId] = peerConnection

        // ローカルストリームを追加し、各トラックをpeerConnection追加追加して、相手に送る準備を行う
        stream
          .getTracks()
          .forEach((track) => peerConnection.addTrack(track, stream))

        // ICE候補の処理
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('signal', {
              from: socket.id,
              to: userId,
              signal: { candidate: event.candidate },
            })
          }
        }

        // リモートストリームを設定
        peerConnection.ontrack = (event) => {
          remoteVideo.srcObject = event.streams[0]
        }

        // 通信相手にオファーを作成
        peerConnection
          .createOffer()
          .then((offer) => peerConnection.setLocalDescription(offer))
          .then(() => {
            socket.emit('signal', {
              from: socket.id,
              to: userId,
              signal: { sdp: peerConnection.localDescription },
            })
          })
      }
    })

    // シグナリングメッセージの処理
    // 受け入れ側
    socket.on('signal', ({ from, signal }) => {
      if (!peerConnections[from]) {
        const peerConnection = new RTCPeerConnection(configuration)
        peerConnections[from] = peerConnection

        // ローカルストリームを追加
        stream
          .getTracks()
          .forEach((track) => peerConnection.addTrack(track, stream))

        // リモートストリームを設定
        peerConnection.ontrack = (event) => {
          remoteVideo.srcObject = event.streams[0]
        }

        // ICE候補の処理
        peerConnection.onicecandidate = (event) => {
          if (event.candidate) {
            socket.emit('signal', {
              from: socket.id,
              to: from,
              signal: { candidate: event.candidate },
            })
          }
        }
      }

      // 既存の接続網を取得
      const peerConnection = peerConnections[from]

      if (signal.sdp) {
        peerConnection
          .setRemoteDescription(new RTCSessionDescription(signal.sdp))
          .then(() => {
            if (peerConnection.remoteDescription.type === 'offer') {
              peerConnection
                .createAnswer()
                .then((answer) => peerConnection.setLocalDescription(answer))
                .then(() => {
                  socket.emit('signal', {
                    from: socket.id,
                    to: from,
                    signal: { sdp: peerConnection.localDescription },
                  })
                })
            }
          })
      } else if (signal.candidate) {
        peerConnection
          .addIceCandidate(new RTCIceCandidate(signal.candidate))
          .catch((err) => {
            console.error('Error adding ICE candidate:', err)
          })
      }
    })

    // 自分のユーザーIDをサーバーに送信
    socket.emit('join', socket.id)
  })
  .catch((error) => {
    console.error('Error accessing media devices.', error)
  })
