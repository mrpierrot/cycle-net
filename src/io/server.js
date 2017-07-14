import xs from 'xstream';
import { SocketWrapper } from './socket';
import { emitAction } from './commons';
import { basicEventFilter } from '../commons';


function makeProducer(server) {
    return function (cfg) {
        let srv;
        const { id, config } = cfg;
        return {
            start(listener) {
                srv = config.port ? server(config.port, config) : config.server ? server(config.server, config) : server(config)

                listener.next({
                    event: 'ready',
                    id
                })

                srv.on('error', (e) => {
                    listener.error({
                        event: 'error',
                        error: e,
                        id
                    })
                })

                srv.on('connection', (socket) => {
                    listener.next({
                        event: 'connection',
                        socket: SocketWrapper(socket),
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

export function ioServer(server) {
    return {
        producer: makeProducer(server),
        sendAction: emitAction,
        eventFilter:basicEventFilter
    }
}