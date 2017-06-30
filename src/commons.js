import { adapt } from '@cycle/run/lib/adapt';
import flattenConcurrently from 'xstream/extra/flattenConcurrently';

export function makeDriver(core,makeCreateAction,sendAction) {

    return function driver(input$) {
        const closeAction$ = input$.filter(o => o.action === 'close');
        const createAction$ = input$.filter(o => o.action === 'create')
            .map(makeCreateAction(core, closeAction$))
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