import xs from 'xstream';
import { adapt } from '@cycle/run/lib/adapt';
import flattenConcurrently from 'xstream/extra/flattenConcurrently';
import socketWrapper from './socket';

function createServerProducer(wsServer,instanceId,config) {
    let server;

    return {
        start(listener) {
            server = wsServer(config);

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
                    socket:socketWrapper(socket),
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

function sendAction({ socket, message  }) {
    socket.send(message)
}

export function makeWSServerDriver(wsServer) {

    return function WSServerDriver(input$) {
        const closeAction$ = input$.filter(o => o.action === 'close');
        const createAction$ = input$.filter(o => o.action === 'create')
            .map(makeCreateAction(wsServer,closeAction$))
            .compose(flattenConcurrently);
        const sendAction$ = input$.filter(o => o.action === 'send').map(sendAction);

        sendAction$.addListener({
            next() { },
            complete() { },
            error() { }
        });

        return {
            select(instanceId) {
                return {
                    events(name) {
                        return adapt(createAction$.filter(o => o.instanceId === instanceId && o.event === name));
                    }
                }
            }
        }

    }
}