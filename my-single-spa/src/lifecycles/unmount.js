import { MOUNTED, NOT_MOUNTED, UNMOUNTING } from "../applications/app.helpers";

export async function toUnmountPromise (app) {
    // 如果当前应用没有被挂载，就什么也不做
    if (app.status !== MOUNTED) {
        return app
    }

    // 源码中这里还做了一些超时处理 
    app.status = UNMOUNTING
    await app.unmount(app.customProps)
    app.status = NOT_MOUNTED
    return app
}