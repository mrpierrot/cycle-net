import xs from 'xstream';
import { adapt } from '@cycle/run/lib/adapt';
import { makeDriver } from './commons';

function createSocketEventProducer(socket, eventName) {
    let eventListener = null;
    return {
        start(listener) {
            eventListener = (e) => {
                let data = e.data;
                if(typeof(data) === 'string'){
                    try{
                        data = JSON.parse(data);
                    }catch(e){
                        // do nothing
                    }
                }
                listener.next({ event: eventName, data });
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
                action:'send',
                message,
                socket
            }
        },
        json(message){
            return {
                action:'send',
                message:JSON.stringify(message),
                socket
            }
        }
    }
}