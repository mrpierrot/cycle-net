import qs from 'querystring';
import xs from 'xstream';
import { createResponseWrapper } from './response';

export function createRequestWrapper(id,req, res, render) {
    return {
        event:'request',
        id,
        original: req,
        url: req.url,
        method: req.method,
        headers: req.headers,
        body: req.body,
        response: createResponseWrapper(id,res, render)
    }
}