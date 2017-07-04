import xs from 'xstream';
import { adapt } from '@cycle/run/lib/adapt';
import flattenConcurrently from 'xstream/extra/flattenConcurrently';


export function makeNetDriver(driver) {

    const {sendAction, producer} = driver;

    return function driver(input$) {
        const closeAction$ = input$.filter(o => o.action === 'close');
        const createAction$ = input$.filter(o => o.action === 'create')
            .map(config => {
                const {id} = config;
                return xs.create(producer(config))
                    .endWhen(closeAction$.filter(o => o.id === id))
            })
            .compose(flattenConcurrently);
        const sendAction$ = input$.filter(o => o.action === 'send').map(sendAction);

        sendAction$.addListener({
            next() { },
            complete() { },
            error() { }
        });

        return {
            select(id) {
                return {
                    events(name) {
                        return adapt(createAction$.filter(o => o.id === id && o.event === name));
                    }
                }
            }
        }

    }
}

export function sendAction({ socket, message  }) {
    socket.send(message)
}