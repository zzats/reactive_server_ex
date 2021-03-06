import "phoenix_html"
import Cycle from '@cycle/core';
import isolate from '@cycle/isolate';
import makeHttpDriver from '@cycle/http'

import Rx from 'rx';
import {div, p, makeDOMDriver} from '@cycle/dom';

import {makePhoenixChannelDriver} from "./drivers/phoenix_socket.js"
import LabeledInput from './components/labeled_input.js';

function main(sources) {
    const inputProps = Rx.Observable.of({
        label: 'Message',
        className: 'message-input',
        placeholder: 'Type in a chat message'
    });

    const channel$ = sources.Channel;
    const chatMessages$ = channel$
        .map(function(msg) {
            return {sender: msg.sender,
                     message: msg.message,
                     time: new Date(msg.timestamp)}
                 })
        .scan((acc, msg) => acc.concat(msg), [])
        .startWith([]);

    const inputSources = {DOM: sources.DOM, props$: inputProps};
    const chatInput = isolate(LabeledInput)(inputSources);
    const chatInputVTree$ = chatInput.DOM;
    const chatInputValues$ = chatInput.value$;

    const state$ = chatMessages$.combineLatest(chatInputVTree$,
        function (messages, input) {
            return {
                messages, input
            };
        });

    const vtree$ = state$.map(({messages, input}) =>
        div([div([
            messages.map(msg => p('['+ msg.time.toLocaleTimeString() + '] ' +  msg.sender + ': ' + msg.message)),
            input
        ])])
    );
    
    return {
        DOM: vtree$,
        Channel: chatInputValues$
    };
}

Cycle.run(main, {
    DOM: makeDOMDriver('#client-app-container'),
    Channel: makePhoenixChannelDriver('lobby')
});