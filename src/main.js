import { mount } from 'svelte';
import App from "./UI";

const app = mount(App, {
    target: document.body
});

export default app;
