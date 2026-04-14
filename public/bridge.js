/**
 * Cheonjiin System Bridge (Node.js)
 * 
 * 이 스크립트는 노트북/컴퓨터에서 실행되어 핸드폰의 신호를 실제 키보드와 마우스 입력으로 변환합니다.
 * 
 * 설치 방법:
 * 1. Node.js가 설치되어 있어야 합니다.
 * 2. 새로운 폴더를 만들고 이 파일을 저장합니다.
 * 3. 터미널에서 다음 명령어를 실행합니다:
 *    npm install socket.io-client @nut-tree/nut-js
 * 4. 스크립트를 실행합니다:
 *    node bridge.js
 */

const { io } = require("socket.io-client");
const { keyboard, mouse, Button, Point, Key } = require("@nut-tree/nut-js");

// 1. 여기에 앱의 URL을 입력하세요 (예: https://ais-dev-...)
const SERVER_URL = "https://ais-dev-tpajlfs2tyf6n446tqxll4-105630807888.asia-east1.run.app"; 
// 2. 노트북 화면에 표시된 6자리 코드를 입력하세요
const ROOM_ID = "XXXXXX"; 

const socket = io(SERVER_URL);

socket.on("connect", () => {
  console.log("서버에 연결되었습니다.");
  socket.emit("join-room", ROOM_ID);
  console.log(`방 ${ROOM_ID}에 참여했습니다. 이제 핸드폰으로 제어할 수 있습니다.`);
});

socket.on("receive-key", async (key) => {
  console.log("키 수신:", key);
  if (key === "backspace") {
    await keyboard.type(Key.Backspace);
  } else if (key === " ") {
    await keyboard.type(Key.Space);
  } else {
    await keyboard.type(key);
  }
});

socket.on("receive-mouse-move", async ({ dx, dy }) => {
  const currentPos = await mouse.getPosition();
  await mouse.setPosition(new Point(currentPos.x + dx, currentPos.y + dy));
});

socket.on("receive-mouse-click", async ({ button }) => {
  if (button === "left") {
    await mouse.click(Button.LEFT);
  } else if (button === "right") {
    await mouse.click(Button.RIGHT);
  }
});

socket.on("disconnect", () => {
  console.log("서버와 연결이 끊겼습니다.");
});
