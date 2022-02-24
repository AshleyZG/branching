import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

/**
 * Initialization data for the branching extension.
 */
const plugin: JupyterFrontEndPlugin<void> = {
  id: 'branching:plugin',
  autoStart: true,
  activate: (app: JupyterFrontEnd) => {
    console.log('JupyterLab extension branching is activated!');
  }
};

export default plugin;
