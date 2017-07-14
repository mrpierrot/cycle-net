import xs from 'xstream';
import { adapt } from '@cycle/run/lib/adapt';
import flattenConcurrently from 'xstream/extra/flattenConcurrently';


export function makeNetDriver(driver) {

    const {sendAction, producer, eventFilter} = driver;

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
                        return adapt(eventFilter(createAction$,id,name));
                        //return adapt(createAction$.filter(o => o.id === id && o.event === name));
                    }
                }
            }
        }

    }
}

export function socketEventFilter(stream$,id,name){
    return xs.merge(
        basicEventFilter(stream$,id,name),
        stream$
            .filter(o => o.id === id && o.event === 'ready')
            .map((obj) => obj.socket.events(name)).compose(flattenConcurrently)
        )
}

export function basicEventFilter(stream$,id,name){
    return stream$.filter(o => o.id === id && o.event === name);
}

export function applyMiddlewares(middlewares, req, res) {

    return new Promise((resolve, reject) => {

        const size = middlewares ? middlewares.length : 0;
        let i = -1;

        function next() {
            i++;
            if (i < size) {
                middlewares[i](req, res, next);
            } else {
                resolve();
            }
        }

        next();
    })
}