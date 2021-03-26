import { BOOTSTRAPPING, LOADING_SOURCE_CODE, MOUNTED, NOT_BOOTSTRAPPED, NOT_LOADED, NOT_MOUNTED, shouldBeActive, SKIP_BECAUSE_BROKEN } from "./app.helpers";
import { reroute } from '../navigations/reroute'

/**
 * 注册应用
 * @param {*} appName 应用名称 
 * @param {*} loadApp 加载的应用
 * @param {*} activeWhen 当激活时会调用 loadApp
 * @param {*} customProps 自定义属性
 */
const apps = []; // 用来存放所有的应用

// 维护应用所有的状态 状态机
export function registerApplication(appName, loadApp, activeWhen, customProps) {
    apps.push({ // 这里就将应用加载好了
        name: appName,
        loadApp,
        activeWhen,
        customProps,
        status: NOT_LOADED
    })

    reroute(); //加载应用 

    console.log(apps)
}

export function getAppChanges () {
    const appsToUnmount = [] // 要卸载的app
    const appsToLoad = [] // 要加载的app
    const appsToMount = [] // 要挂在的app

    apps.forEach(app => {
        // 需不需要被加载
        const appSholdBeActive = shouldBeActive(app)

        switch (app.status) {
            case NOT_LOADED:
            case LOADING_SOURCE_CODE: {
                if (appSholdBeActive) {
                    appsToLoad.push(app)
                }
            } break;
            case NOT_BOOTSTRAPPED:
            case BOOTSTRAPPING:
            case NOT_MOUNTED: {
                if(appSholdBeActive) {
                    appsToMount.push(app)
                }
            } break;
            case MOUNTED: {
                if (!appSholdBeActive) {
                    appsToUnmount.push(app)
                }
            } break;
        }
    })

    return { appsToUnmount, appsToLoad, appsToMount }
}