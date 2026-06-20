import { App } from "antd";

let message: any;
let notification: any;
let modal: any;

export default () => {
    const staticFunction = App.useApp();
    message = staticFunction.message;
    notification = staticFunction.notification;
    modal = staticFunction.modal;
    return null;
};

export { message, notification, modal };
