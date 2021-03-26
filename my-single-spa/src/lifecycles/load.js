import { LOADING_SOURCE_CODE, NOT_BOOTSTRAPPED } from "../applications/app.helpers";

function flattenFnArray(fns) {
    if (!Array.isArray(fns)) {
        fns = [fns]
    }

    // 将数组中的方法组合成一个promise链来链式调用，多个方法组合成一个方法来调用
    return props => fns.reduce((p, fn) => p.then(() => fn(props)), Promise.resolve())
    // return function (props) {
    //     return fns.reduce((p, fn) => p.then(() => fn(props)), Pormise.resolve())
    // }
}

export async function toLoadPromise(app) {
    if (app.loadPromise) {
        return app.loadPromise // 缓存机制
    }

    app.loadPromise = Promise.resolve().then(async () => {
        app.status = LOADING_SOURCE_CODE

        let { bootstrap, mount, unmount } = await app.loadApp(app.customProps)
        app.status = NOT_BOOTSTRAPPED // 没有调用bootstrap方法

        // 希望将多个promise组合在一起 compose
        app.bootstrap = flattenFnArray(bootstrap)
        app.mount = flattenFnArray(mount)
        app.unmount = flattenFnArray(unmount)

        delete app.loadPromise
        return app
    })

    return app.loadPromise
}

export async function toLoadPromiseOld(app) {

    app.status = LOADING_SOURCE_CODE

    let { bootstrap, mount, unmount } = await app.loadApp(app.customProps)
    app.status = NOT_BOOTSTRAPPED // 没有调用bootstrap方法

    // 希望将多个promise组合在一起 compose
    app.bootstrap = flattenFnArray(bootstrap)
    app.mount = flattenFnArray(mount)
    app.unmount = flattenFnArray(unmount)

    return app
}