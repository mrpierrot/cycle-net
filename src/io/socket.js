import xs from 'xstream';
import { adapt } from '@cycle/run/lib/adapt';
import { makeDriver } from './commons';

function createSocketEventProducer(socket, eventName) {
    let eventListener = null;
    return {
        start(listener) {
            if(socket.on){
                eventListener = (data) => listener.next({ event: eventName, data });
                socket.on(eventName, eventListener)
            }else{
                 eventListener = (e) => {
                    listener.next({ event: eventName, data:e.data });
                }
                socket.addEventListener(eventName, eventListener)
            }
           
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
        send(name,message){
            return {
                action:'send',
                eventName:name,
                message,
                socket
            }
        }
    }
}