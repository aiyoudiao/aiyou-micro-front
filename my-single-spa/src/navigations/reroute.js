import { getAppChanges } from "../applications/app";
import { toBootstrapPromise } from "../lifecycles/bootstrap";
import { toLoadPromise } from "../lifecycles/load";
import { toMountPromise } from "../lifecycles/mount";
import { toUnmountPromise } from "../lifecycles/unmount";
import { started } from "../start";

import './navigator-events'

// 核心应用处理方法
export function reroute () {
    // 1、需要获取要加载的应用
    // 2、需要获取要被挂载的应用
    // 3、哪些应用需要被卸载
    const { appsToUnmount, appsToLoad, appsToMount } = getAppChanges()
    console.log(appsToUnmount, appsToLoad, appsToMount)
    
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
        let apps = await Promise.all(appsToLoad.map(toLoadPromise)) // 获取bootstrap、mount、unmount方法，并放到app上 
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
        let unmountPromises = appsToUnmount.map(toUnmountPromise) // 需要去卸载的app

        appsToLoad.map(async (app) => {
            // 将需要加载的应用拿到 => 加载 => 启动 => 挂载
            app = await toLoadPromise(app)
            app = await toBootstrapPromise(app)
            return await toMountPromise(app)
        })

        appsToMount.map(async (app) => {
            app = await toBootstrapPromise(app)
            return toMountPromise(app)
        })
    }
}

// 这个流程是用于初始化操作的，但是还需要当路径切换时重新加载应用
// 重写路由相关的方法