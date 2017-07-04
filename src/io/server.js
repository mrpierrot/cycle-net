import xs from 'xstream';
import { SocketWrapper } from '../socket';
import { makeDriver, sendAction } from '../commons';


function makeProducer(clazz){
    return function(cfg) {
        let srv;
        const {id, server, port, config} = cfg;
        return {
            start(listener) {

                srv = port?new clazz(port,config):server?new clazz(server,config):new clazz(config)

                listener.next({
                    event: 'ready',
                    id
                })

                srv.on('error',(e)=>{
                    listener.error({
                        event: 'error',
                        error:e,
                        id
                    })
                })

                srv.on('connection',(socket)=>{
                    listener.next({
                        event: 'connection',
                        socket:SocketWrapper(socket),
                        id
                    })
                })
            },

            stop() {
                srv.close();
            }
        }
    }

}

export function ioServer(clazz){
    return {
        producer: makeProducer(clazz),
        sendAction:sendAction
    }
}