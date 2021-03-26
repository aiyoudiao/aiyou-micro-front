(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.singleSpa = {}));
}(this, (function (exports) { 'use strict';

    // 描述应用的整个状态
    const NOT_LOADED = 'NOT_LOADED'; // 未加载，也是应用初始状态
    const LOADING_SOURCE_CODE = 'LOADING_SOURCE_CODE'; // 加载资源
    const NOT_BOOTSTRAPPED = 'NOT_BOOTSTRAPPED'; // 还没有调用bootstrap方法
    const BOOTSTRAPPING = 'BOOTSTRAPPING'; // 启动中
    const NOT_MOUNTED = 'NOT_MOUNTED'; // 还没有调用mount方法
    const MOUNTING = 'MOUNTING'; // 正在挂载中
    const MOUNTED = 'MOUNTED'; // 挂载完毕
    const UNMOUNTING = 'UN_MOUNTING'; // 解除挂载

    // 当前应用是否要被激活
    function shouldBeActive(app) { // 如果返回true就表示要被激活，那么就可以进行一系列初始化应用的操作
        return app.activeWhen(window.location)
    }

    async function toBootstrapPromise(app) {
        if (app.status !== NOT_BOOTSTRAPPED) {
            return app
        }

        app.status = BOOTSTRAPPING;
        await app.bootstrap(app.customProps);
        app.status = NOT_MOUNTED;

        return app
    }

    function flattenFnArray(fns) {
        if (!Array.isArray(fns)) {
            fns = [fns];
        }

        // 将数组中的方法组合成一个promise链来链式调用，多个方法组合成一个方法来调用
        return props => fns.reduce((p, fn) => p.then(() => fn(props)), Promise.resolve())
        // return function (props) {
        //     return fns.reduce((p, fn) => p.then(() => fn(props)), Pormise.resolve())
        // }
    }

    async function toLoadPromise(app) {
        if (app.loadPromise) {
            return app.loadPromise // 缓存机制
        }

        app.loadPromise = Promise.resolve().then(async () => {
            app.status = LOADING_SOURCE_CODE;

            let { bootstrap, mount, unmount } = await app.loadApp(app.customProps);
            app.status = NOT_BOOTSTRAPPED; // 没有调用bootstrap方法

            // 希望将多个promise组合在一起 compose
            app.bootstrap = flattenFnArray(bootstrap);
            app.mount = flattenFnArray(mount);
            app.unmount = flattenFnArray(unmount);

            delete app.loadPromise;
            return app
        });

        return app.loadPromise
    }

    async function toMountPromise(app) {
        if(app.status !== NOT_MOUNTED) {
            return app;
        }

        app.status = MOUNTING;
        await app.mount(app.customProps);
        app.status = MOUNTED;

        return app 
    }

    async function toUnmountPromise (app) {
        // 如果当前应用没有被挂载，就什么也不做
        if (app.status !== MOUNTED) {
            return app
        }

        // 源码中这里还做了一些超时处理 
        app.status = UNMOUNTING;
        await app.unmount(app.customProps);
        app.status = NOT_MOUNTED;
        return app
    }

    let started = false;
    function start() {

        started = true;
        // 需要挂载应用
        reroute (); // 除了加载应用还需要去挂载应用
    }

    const routingEventsListeningTo = ['hashchage', 'popstate'];

    /**
     * !当应用加载完毕后，才会执行那些拦截到的事件
     */
    function urlReroute(e) {
        reroute(); // 会根据路径重新加载不同的应用
    }

    const captureEventListeners = { // 后续挂载的事件先暂存起来
        hashchange: [],
        popstate: []
    };

    window.addEventListener('hashchange', urlReroute);
    window.addEventListener('popstate', urlReroute);

    const originalAddEventListener = window.addEventListener;
    const originalRemoveEventListener = window.removeEventListener;

    window.addEventListener = function (eventName, fn) {
        if(routingEventsListeningTo.indexOf(eventName) >= 0 &&
            !captureEventListener[eventName].some(listener => listener === fn)
        ) {
            captureEventListeners[eventName].push(fn);
            return
        }

        return originalAddEventListener.apply(this, arguments)
    };

    window.removeEventListener = function (eventName, fn) {
        if (routingEventsListeningTo.indexOf(eventName) >= 0) {
            captureEventListeners[eventName] = captureEventListeners[eventName].filters(l => l!== fn);
            return;
        }

        return originalRemoveEventListener.apply(this, arguments)
    };

    // 如果是hash路由，hash变化时可以切换
    // 浏览器路由，浏览器路由时h5api的，如果切换时不会触发popstate

    function patchedUpdateState(updateState, methodName) {
        return function () {
            const urlBefore = window.location.href;
            updateState.apply(this, arguments); // 调用切换方法

            const urlAfter = window.location.href;

            if (urlBefore !== urlAfter) {
                // 重新加载应用 传入事件源
                urlReroute(new PopStateEvent('popstate'));
            }
        }
    }

    window.history.pushState = patchedUpdateState(window.history.pushState);
    window.history.replaceState = patchedUpdateState(window.history.replaceState);


    // 用户可能还会绑定自己的路由事件 vue

    // 当我们应用切换后，还需要处理原来的方法，需要在应用切换后再执行

    // 核心应用处理方法
    function reroute () {
        // 1、需要获取要加载的应用
        // 2、需要获取要被挂载的应用
        // 3、哪些应用需要被卸载
        const { appsToUnmount, appsToLoad, appsToMount } = getAppChanges();
        console.log(appsToUnmount, appsToLoad, appsToMount);
        
        if (started) {
            // console.log('start方法 已经被调用')
            return performAppChanges(); // 根据路径来装载应用
        } else {
            // console.log('start方法 未被调用，那就调用registerApplication')

            // 注册应用时，需要预先加载
            return loadApps(); // 预加载应用
        }

        // 预加载应用
        async function loadApps() {
            await Promise.all(appsToLoad.map(toLoadPromise)); // 获取bootstrap、mount、unmount方法，并放到app上 
            // mount 和 unmount 方法放到app上
        }
        // 根据路径来装载应用
        async function performAppChanges() {
            /**
             * ! 路由切换也是这个原理
             * 1. 先卸载不需要的应用
             * 2. 去加载需要的应用 
             */

            // 这里不使用await，就是实现了并发卸载
            appsToUnmount.map(toUnmountPromise); // 需要去卸载的app

            appsToLoad.map(async (app) => {
                // 将需要加载的应用拿到 => 加载 => 启动 => 挂载
                app = await toLoadPromise(app);
                app = await toBootstrapPromise(app);
                return await toMountPromise(app)
            });

            appsToMount.map(async (app) => {
                app = await toBootstrapPromise(app);
                return toMountPromise(app)
            });
        }
    }

    // 这个流程是用于初始化操作的，但是还需要当路径切换时重新加载应用
    // 重写路由相关的方法

    /**
     * 注册应用
     * @param {*} appName 应用名称 
     * @param {*} loadApp 加载的应用
     * @param {*} activeWhen 当激活时会调用 loadApp
     * @param {*} customProps 自定义属性
     */
    const apps = []; // 用来存放所有的应用

    // 维护应用所有的状态 状态机
    function registerApplication(appName, loadApp, activeWhen, customProps) {
        apps.push({ // 这里就将应用加载好了
            name: appName,
            loadApp,
            activeWhen,
            customProps,
            status: NOT_LOADED
        });

        reroute(); //加载应用 

        console.log(apps);
    }

    function getAppChanges () {
        const appsToUnmount = []; // 要卸载的app
        const appsToLoad = []; // 要加载的app
        const appsToMount = []; // 要挂在的app

        apps.forEach(app => {
            // 需不需要被加载
            const appSholdBeActive = shouldBeActive(app);

            switch (app.status) {
                case NOT_LOADED:
                case LOADING_SOURCE_CODE: {
                    if (appSholdBeActive) {
                        appsToLoad.push(app);
                    }
                } break;
                case NOT_BOOTSTRAPPED:
                case BOOTSTRAPPING:
                case NOT_MOUNTED: {
                    if(appSholdBeActive) {
                        appsToMount.push(app);
                    }
                } break;
                case MOUNTED: {
                    if (!appSholdBeActive) {
                        appsToUnmount.push(app);
                    }
                } break;
            }
        });

        return { appsToUnmount, appsToLoad, appsToMount }
    }

    exports.registerApplication = registerApplication;
    exports.start = start;

    Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=single-spa.js.map
