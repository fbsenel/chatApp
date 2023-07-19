const socket = io.connect('http://localhost:3000');
let client;
let localStream;
let inCall = false;
let recorder;
let recordingStartTime;
let cameraStartTime;
let recordingTimerInterval;
let cameraTimerInterval;

const sender = document.getElementById('sender');
const message = document.getElementById('message');
const output = document.getElementById('output');
const submitButton = document.getElementById('submitButton');
const callButton = document.getElementById('callButton');
const startRecordingButton = document.getElementById('startRecordingButton');
const stopRecordingButton = document.getElementById('stopRecordingButton');
const startCameraButton = document.getElementById('startCameraButton');
const stopCameraButton = document.getElementById('stopCameraButton');
const videoElement = document.getElementById('videoElement');
const recordingTimerElement = document.getElementById('recordingTimer');
const cameraTimerElement = document.getElementById('cameraTimer');
const takePictureButton = document.getElementById('takePictureButton');

submitButton.addEventListener('click', () => {
  sendMessage();
});

message.addEventListener('keypress', (event) => {
  if (event.keyCode === 13) {
    sendMessage();
  }
});

startRecordingButton.addEventListener('click', () => {
  startRecording();
});

stopRecordingButton.addEventListener('click', () => {
  stopRecording();
});

startCameraButton.addEventListener('click', () => {
  startCamera();
});

stopCameraButton.addEventListener('click', () => {
  stopCamera();
});

takePictureButton.addEventListener('click', () => {
  takePicture();
});

socket.on('chat', (data) => {
  const messageContainer = document.createElement('div');
  messageContainer.innerHTML = `<strong>${data.sender}: </strong>`;

  if (data.message.startsWith('data:audio/wav;base64')) {
    const audioElement = document.createElement('audio');
    audioElement.src = data.message;
    audioElement.controls = true;
    messageContainer.appendChild(audioElement);
  } else if (data.message.startsWith('data:image/jpeg;base64')) {
    const imageElement = document.createElement('img');
    imageElement.src = data.message;
    messageContainer.appendChild(imageElement);
  } else {
    messageContainer.innerHTML += data.message;
  }

  output.appendChild(messageContainer);
  message.value = '';
});

socket.on('voiceMessage', (data) => {
  const audioElement = document.createElement('audio');
  audioElement.src = data.message;
  audioElement.controls = true;
  const messageContainer = document.createElement('div');
  const senderName = document.createElement('strong');
  senderName.innerText = data.sender + ': ';
  messageContainer.appendChild(senderName);
  messageContainer.appendChild(audioElement);
  output.appendChild(messageContainer);
});



function sendMessage() {
  const msg = message.value.trim();
  if (msg !== '') {
    socket.emit('chat', {
      message: msg,
      sender: sender.value,
    });
  }
}

function startRecording() {
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then((stream) => {
      recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstart = () => {
        recordingStartTime = Date.now();
        recordingTimerInterval = setInterval(updateRecordingTimer, 1000);
      };
      recorder.onstop = () => {
        clearInterval(recordingTimerInterval);
        const blob = new Blob(chunks, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.onload = () => {
          const base64AudioData = reader.result.split(',')[1];
          socket.emit('voiceMessage', {
            sender: sender.value,
            message: base64AudioData,
          });
        };
        reader.readAsDataURL(blob);
      };
      recorder.start();
      startRecordingButton.disabled = true;
      stopRecordingButton.disabled = false;
    })
    .catch((err) => console.error('Error accessing microphone:', err));
}

function stopRecording() {
  if (recorder && recorder.state === 'recording') {
    recorder.stop();
    clearInterval(recordingTimerInterval);
    startRecordingButton.disabled = false;
    stopRecordingButton.disabled = true;
    recordingTimerElement.textContent = '';
  }
}

function startCamera() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then((stream) => {
      localStream = stream;
      videoElement.srcObject = stream;
      startCameraButton.disabled = true;
      stopCameraButton.disabled = false;
      startCameraTimer();
    })
    .catch((err) => console.error('Error accessing camera:', err));
}

function stopCamera() {
  if (localStream) {
    const tracks = localStream.getTracks();
    tracks.forEach((track) => track.stop());
    localStream = null;
    videoElement.srcObject = null;
    startCameraButton.disabled = false;
    stopCameraButton.disabled = true;
    clearInterval(cameraTimerInterval);
    cameraTimerElement.textContent = '';
  }
}

function updateRecordingTimer() {
  const elapsedTime = Math.floor((Date.now() - recordingStartTime) / 1000);
  const minutes = Math.floor(elapsedTime / 60);
  const seconds = elapsedTime % 60;
  recordingTimerElement.textContent = `Voice recording: ${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function startCameraTimer() {
  cameraStartTime = Date.now();
  updateCameraTimer();
  cameraTimerInterval = setInterval(updateCameraTimer, 1000);
}

function updateCameraTimer() {
  const elapsedTime = Math.floor((Date.now() - cameraStartTime) / 1000);
  const minutes = Math.floor(elapsedTime / 60);
  const seconds = elapsedTime % 60;
  cameraTimerElement.textContent = `Camera Time: ${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function takePicture() {
  if (localStream) {
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    const imageDataURL = canvas.toDataURL('image/jpeg');
    socket.emit('chat', {
      sender: sender.value,
      message: imageDataURL,
    });
  }
}