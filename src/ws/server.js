import xs from 'xstream';
import { SocketWrapper } from '../socket';
import { makeDriver, sendAction } from '../commons';


function makeProducer(clazz){
    return function(cfg) {
        let server;
        const {id, config} = cfg;
        return {
            start(listener) {
                server = new clazz(config,()=>{
                    listener.next({
                        event: 'ready',
                        id
                    })
                });

                server.on('error',(e)=>{
                    listener.error({
                        event: 'error',
                        error:e,
                        id
                    })
                })

                server.on('connection',(socket)=>{
                    listener.next({
                        event: 'connection',
                        socket:SocketWrapper(socket),
                        id
                    })
                })
            },

            stop() {
                server.close();
            }
        }
    }

}

export function wsServer(clazz){
    return {
        producer: makeProducer(clazz),
        sendAction:sendAction
    }
}