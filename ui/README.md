# ui/ - User Interface

A user interface code built on top of [`../lib/`](../lib/).
Uses Vue 3 [single-file components](https://vuejs.org/guide/scaling-up/sfc.html)
and [composition API](https://vuejs.org/api/composition-api-setup.html).

Directories:
* `common/` - Contains generic vue components with no app-specific logic. Think
        of this as a small library of style components which just happens to be
        written specifically for this ui.
* `components/` - Vue components which have app-specific logic.
* `pages/` - One component for each page.