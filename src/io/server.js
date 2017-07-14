import xs from 'xstream';
import { SocketWrapper } from './socket';
import { emitAction } from './commons';
import { basicEventFilter } from '../commons';


function makeProducer(clazz) {
    return function (cfg) {
        let srv;
        const { id, config } = cfg;
        return {
            start(listener) {
                srv = config.port ? new clazz(config.port, config) : config.server ? new clazz(config.server, config) : new clazz(config)

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

export function ioServer(clazz) {
    return {
        producer: makeProducer(clazz),
        sendAction: emitAction,
        eventFilter:basicEventFilter
    }
}