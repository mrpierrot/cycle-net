import xs from 'xstream';

function createSocketEventProducer(socket, eventName) {
    let eventListener = null;
    return {
        start(listener) {
            eventListener = (data) => {
                listener.next({ name: eventName, data });
            }
            socket.addEventListener(eventName, eventListener);
        },
        stop() {
            socket.removeListener(eventName, eventListener)
        }
    }
}

export function SocketWrapper(socket) {

    return {
        _original: socket,
        events(eventName) {
            return adapt(xs.create(createSocketEventProducer(socket, eventName)))
        },
        send(message){
            return {
                message,
                socket
            }
        }
    }
}