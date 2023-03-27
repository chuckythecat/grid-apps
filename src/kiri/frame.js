/** Copyright Stewart Allen <sa@grid.space> -- All Rights Reserved */

"use strict";

// use: load.stl
// use: load.svg
// use: kiri.api
// use: kiri.platform
// use: kiri.settings
// use: kiri.widget
gapp.register("kiri.frame", [], (root, exports) => {

let debug = false;

// add frame message api listener
window.addEventListener('message', msg => {
    const { load, kiri, moto } = self;
    const { api, newWidget } = kiri;
    const { conf, event, feature, platform, settings, show } = api;

    if (!feature.frame) {
        if (debug) console.log("frame is not supported");
        return;
    }

    const { origin, source, target, data } = msg;

    if (debug) {
        console.warn("frame: new message:");
        console.log(`frame: origin: ${origin} (${typeof origin})`);
        // console.log(`source: ${source}`);
        console.log(`frame: target: ${target.location.href}`);
        console.log(`frame: source=target: ${source.window === target.window}`);
        console.log(`frame: data: ${JSON.stringify(data)}`);
    }

    if (source.window === target.window) {
        if (debug) console.log("source window is target window");
        return;
    }

    let windowparent = window.top;
    // const send = source.window.postMessage;

    if (data.mode) {
        api.mode.set(data.mode.toUpperCase());
    }

    if (data.view) {
        api.view.set(VIEWS[data.view.toUpperCase()]);
    }

    if (data.function) {
        const cb = data.callback ? (output) => {
            // send({event:`${data.function}.done`, data: output});
            windowparent.postMessage({event:`${data.function}.done`, data: output}, origin);
        } : undefined;
        api.function[data.function.toLowerCase()](cb);
    }

    if (data.event) {
        if (debug) console.log(`${data.event} subscription from ${origin} received`);
        event.on(data.event, (evd) => {
            // send({event: data.event, data: evd}, "*");
            windowparent.postMessage({event: data.event, data: evd}, origin);
            if (debug) console.log(`${data.event} sent to ${origin}`);
        });
    }

    if (data.emit) {
        event.emit(data.emit, data.message)
    }

    if (data.get) switch (data.get) {
        // case "mode": send({mode: settings.mode()}); break;
        // case "device": send({device: settings.dev()}); break;
        // case "process": send({process: settings.proc()}); break;
        // default: send({all: settings}); break;

        case "mode": windowparent.postMessage({mode: settings.mode()}, origin); break;
        case "device": windowparent.postMessage({device: settings.dev()}, origin); break;
        case "process": windowparent.postMessage({process: settings.proc()}, origin); break;
        default: windowparent.postMessage({all: settings}, origin); break;
    }

    if (data.features) {
        Object.assign(feature, data.features);
    }

    if (data.device) {
        Object.assign(settings.dev(), data.device);
        conf.save();
    }

    if (data.process){
        Object.assign(settings.proc(), data.process);
        conf.save();
    }

    if (data.controller){
        let ctrl = settings.ctrl();
        Object.assign(ctrl, data.controller);
        api.event.emit("set.threaded", ctrl.threaded);
        conf.save();
    }

    if (data.parse) {
        let bin = data.parse;
        let widget;
        switch ((data.type || 'stl').toLowerCase()) {
            case 'stl':
                if (!bin.buffer) bin = new Float32Array(bin).buffer;
                new load.STL().parse(bin, vertices => {
                    platform.add(widget = newWidget().loadVertices(vertices));
                    // send({event: "parsed", data: [ widget.id ]});
                    windowparent.postMessage({event: "parsed", data: [ widget.id ]}, origin);
                });
                break;
            case 'obj':
                // todo
                break;
            case '3mf':
                // todo
                break;
            case 'svg':
                let wid = [];
                for (let svg of load.SVG.parse(bin)) {
                    if (!(svg && svg.length)) continue;
                    platform.add(widget = newWidget().loadVertices(svg.toFloat32()));
                    wid.push(widget.id);
                }
                // send({event: "parsed", data: wid});
                windowparent.postMessage({event: "parsed", data: wid}, origin);
                break;
        }
    }

    if (data.load) {
        platform.load(data.load, (verts, widget) => {
            // send({event: "loaded", data: [ widget.id ]});
            windowparent.postMessage({event: "loaded", data: [ widget.id ]}, origin);
        })
    };

    if (data.clear) {
        if (debug) console.log("received command to clear");
        platform.clear();
    }

    if (data.alert) {
        show.alert(data.alert, data.time);
    }

    if (data.progress >= 0) {
        show.progress(data.progress, data.message);
    }
});

});
