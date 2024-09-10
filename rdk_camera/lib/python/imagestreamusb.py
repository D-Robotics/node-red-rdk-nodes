import cv2
import signal
import websockets
import asyncio
import sys
import os
from time import perf_counter



width = int(sys.argv[1])
height = int(sys.argv[2])
fps = int(sys.argv[3])
fcount = int(30/fps)
port = int(sys.argv[4])

def signal_handler(signal, frame):
    sys.exit(0)

def is_usb_camera(device):
    try:
        cap = cv2.VideoCapture(device)
        if not cap.isOpened():
            return False
        cap.release()
        return True
    except Exception:
        return False

def find_first_usb_camera():
    video_devices = [os.path.join('/dev', dev) for dev in os.listdir('/dev') if dev.startswith('video')]
    for dev in video_devices:
        if is_usb_camera(dev):
            return dev
    return None

async def send_image_stream(websocket, path):
    video_device = find_first_usb_camera()
    cap = cv2.VideoCapture(video_device)
    if(not cap.isOpened()):
        print('failed')
        await websocket.close(reason='exit')
    codec = cv2.VideoWriter_fourcc( 'M', 'J', 'P', 'G' )
    cap.set(cv2.CAP_PROP_FOURCC, codec)
    cap.set(cv2.CAP_PROP_FPS, fps)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, width)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, height)

    count = 1
    try:
        while True:
            _ ,frame = cap.read()
            if(count%fcount != 0):
                count += 1
                continue
            else:
                count = 1
            imgBuffer = cv2.imencode('.jpg', frame)[1].tobytes()
            await websocket.send(imgBuffer)
    except:
        cap.release()


if __name__ == '__main__':
    signal.signal(signal.SIGINT, signal_handler)
    ws_server = websockets.serve(send_image_stream, "0.0.0.0", port)
    asyncio.get_event_loop().run_until_complete(ws_server)
    asyncio.get_event_loop().run_forever()
