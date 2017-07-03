import xs from 'xstream';
import { SocketWrapper } from './socket';
import { makeDriver, sendAction } from './commons';

function createServerProducer(wsServer,instanceId,config) {
    let server;

    return {
        start(listener) {
            server = new wsServer(config,()=>{
                listener.next({
                    event: 'ready',
                    instanceId
                })
            });

            server.on('error',(e)=>{
                listener.error({
                    event: 'error',
                    error:e,
                    instanceId
                })
            })

            server.on('connection',(socket)=>{
                listener.next({
                    event: 'connection',
                    socket:SocketWrapper(socket),
                    instanceId
                })
            })
        },

        stop() {
            server.close();
        }
    }
}

function makeCreateAction(wsServer,stopAction$) {
    return function createAction({ id, config }) {
        return xs.create(createServerProducer(wsServer,id, config))
            .endWhen(stopAction$.filter(o => o.id === id))
    }
}

export function makeWSServerDriver(wsServer) {

    return makeDriver(wsServer,makeCreateAction,sendAction);

}