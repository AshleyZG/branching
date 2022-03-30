import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import {
  NotebookPanel,
  INotebookModel,
} from '@jupyterlab/notebook';
import { IDisposable, DisposableDelegate } from '@lumino/disposable';
import { ToolbarButton } from '@jupyterlab/apputils';
import { PanelLayout } from '@lumino/widgets';

import { CodeCell } from '@jupyterlab/cells';
import { ISessionContext } from '@jupyterlab/apputils';
import { Kernel, KernelMessage } from '@jupyterlab/services';
import {
  OutputArea,
} from '@jupyterlab/outputarea';

import {
  YCodeCell
} from '@jupyterlab/shared-models';

import {
  JSONObject,
} from '@lumino/coreutils';

import { IObservableJSON, IObservableMap } from '@jupyterlab/observables';
import {
    ReadonlyPartialJSONValue
  } from '@lumino/coreutils';

import { Wrapper, SideViewWidget, SideViewModel } from './wrapper';


function newOnMetadataChanged (cell: CodeCell){
  function fn (
    model: IObservableJSON,
    args: IObservableMap.IChangedArgs<ReadonlyPartialJSONValue | undefined>
   ): void{
    switch (args.key) {
      case 'jupyter':
        if (cell.syncCollapse) {
          cell.loadCollapseState();
        }
        break;
      case 'editable':
        if (cell.syncEditable) {
          cell.loadEditableState();
        }
        break;

      case 'inWrapper':
        cell.addClass('in-wrapper-cell');
      case 'width':
        cell.node.style.width = args.newValue as string;
      default:
        // console.log('000');
        break;
    }

  }
  return fn
}


/**
 * The plugin registration information.
 */
 const plugin: JupyterFrontEndPlugin<void> = {
  activate: activate,
  id: 'toolbar-button',
  autoStart: true,
};

/**
 * A notebook widget extension that adds a button to the toolbar.
 */
export class BranchButtonExtension
 implements DocumentRegistry.IWidgetExtension<NotebookPanel, INotebookModel>
    {
    /**
     * Create a new extension for the notebook panel widget.
     *
     * @param panel Notebook panel
     * @param context Notebook context
     * @returns Disposable on the added button
     */

    // wrapperList: Wrapper[] = [];
    sideViewWidget: SideViewWidget | undefined;
    createNew(
        panel: NotebookPanel,
        context: DocumentRegistry.IContext<INotebookModel>
        ): IDisposable {

        // add a widget to the right of notebook panel
        // and set notebook width to 80%, check css
        var sideViewModel = new SideViewModel();
        var sideView = new SideViewWidget(sideViewModel);
        (panel.layout as PanelLayout).addWidget(sideView);
        (panel.layout as PanelLayout).widgets[2].addClass('my-notebook-content-panel');
        this.sideViewWidget = sideView;


        // set CodeCell execute method
        CodeCell['execute'] = this.execute;

        const callback = () => {
            this.createWrapper(panel);
        };
        const forkCallback = () => {
            this.fork(panel);
        }
        const hideCallback = () => {
            this.hide(panel);
        }
        const branchModeCallback = () => {
          this.turnOnBranchMode(panel);
        }

        const button = new ToolbarButton({
            className: 'create-wrapper-button',
            label: 'Create Wrapper',
            onClick: callback,
            tooltip: 'Create A Wrapper',
        });

        const forkButton = new ToolbarButton({
            className: 'fork-branch',
            label: 'Fork',
            onClick: forkCallback,
            tooltip: 'Fork A Branch',
        })

        const hideButton = new ToolbarButton({
            className: 'hide-branch',
            label: 'Hide',
            onClick: hideCallback,
            tooltip: 'Hide A Branch',
        })

        const BranchModeButton = new ToolbarButton({
          className: 'branch-mode',
          label: 'Branch Mode',
          onClick: branchModeCallback,
          tooltip: 'Turn On Branch Mode',
        })


        panel.toolbar.insertItem(10, 'clearOutputs', button);
        panel.toolbar.insertItem(11, 'fork', forkButton);
        panel.toolbar.insertItem(12, 'hide', hideButton);
        panel.toolbar.insertItem(13, 'branchMdoe', BranchModeButton);
        return new DisposableDelegate(() => {
            button.dispose();
            forkButton.dispose();
            hideButton.dispose();
            BranchModeButton.dispose();
        });
    }

    createWrapper(panel: NotebookPanel){
        console.log('create wrapper');

        // get active cell information 
        var activeCell = panel.content.activeCell;
        var activeCellIndex = panel.content.activeCellIndex;

        // reset metadata.changed fn
        activeCell?.model.metadata.changed.connect(newOnMetadataChanged(panel.content.widgets[activeCellIndex] as CodeCell));

        // create a wrapper model
        var wrapper: Wrapper = this.sideViewWidget!.model.createWrapper();
        wrapper.insertCell(activeCell!);        

        // add inWrapper attribute to metadata
        activeCell!.model.metadata.set('inWrapper', true);
        activeCell!.model.metadata.set('wrapperID', wrapper.id);

    }

    fork(panel: NotebookPanel){
        console.log('fork');
        var activeCellIndex = panel.content.activeCellIndex;

        // copy paste a cell
        var activeCell = panel.content.activeCell;
        var activeYCell = panel.model!.sharedModel.cells[activeCellIndex];
        var newYCell = YCodeCell.create();
        panel.model?.sharedModel.insertCell(activeCellIndex+1, newYCell);
        newYCell.setSource(activeYCell.getSource());
        var newCell = panel.content.widgets[activeCellIndex+1];
        newCell.model.metadata.changed.connect(newOnMetadataChanged(newCell as CodeCell));
        
        // get wrapper
        var wrapperID = activeCell?.model.sharedModel.getMetadata().wrapperID;
        var wrapper = this.sideViewWidget!.model.wrappers[wrapperID];

        // insert new cell to wrapper
        this.sideViewWidget?.model.pushCellToWrapper(newCell, wrapperID);

        // update metadata
        newCell.model.metadata.set('inWrapper', true);
        newCell.model.metadata.set('wrapperID', wrapper.id);

    }

    /**
     * This function if for user to hide branches. 
     * @param panel 
     */
    hide(panel: NotebookPanel){
        var activeCell = panel.content.activeCell;

        // get wrapper
        var wrapperID = activeCell?.model.sharedModel.getMetadata().wrapperID;

        // hide cell in wrapper
        this.sideViewWidget?.model.hideCellInWrapper(activeCell!, wrapperID);

    }

    turnOnBranchMode(panel: NotebookPanel){
      var script = `
      from types import SimpleNamespace
      namespaceList = []
      `;
      //  '';
      panel.context.sessionContext.session?.kernel?.requestExecute({code: script}, true);
    }

    async execute(
      cell: CodeCell,
      sessionContext: ISessionContext,
      metadata?: JSONObject    
    ): Promise<KernelMessage.IExecuteReplyMsg | void> {
      const model = cell.model;
      // const code = model.value.text;
      const code = `print('hello')`;
      if (!code.trim() || !sessionContext.session?.kernel) {
        model.clearExecution();
        return;
      }
      const cellId = { cellId: model.id };
      metadata = {
        ...model.metadata.toJSON(),
        ...metadata,
        ...cellId
      };
      const { recordTiming } = metadata;
      model.clearExecution();
      cell.outputHidden = false;
      cell.setPrompt('*');
      model.trusted = true;
      let future:
        | Kernel.IFuture<
            KernelMessage.IExecuteRequestMsg,
            KernelMessage.IExecuteReplyMsg
          >
        | undefined;
      try {
        const msgPromise = OutputArea.execute(
          code,
          cell.outputArea,
          sessionContext,
          metadata
        );
        // cell.outputArea.future assigned synchronously in `execute`
        if (recordTiming) {
          const recordTimingHook = (msg: KernelMessage.IIOPubMessage) => {
            let label: string;
            switch (msg.header.msg_type) {
              case 'status':
                label = `status.${
                  (msg as KernelMessage.IStatusMsg).content.execution_state
                }`;
                break;
              case 'execute_input':
                label = 'execute_input';
                break;
              default:
                return true;
            }
            // If the data is missing, estimate it to now
            // Date was added in 5.1: https://jupyter-client.readthedocs.io/en/stable/messaging.html#message-header
            const value = msg.header.date || new Date().toISOString();
            const timingInfo: any = Object.assign(
              {},
              model.metadata.get('execution')
            );
            timingInfo[`iopub.${label}`] = value;
            model.metadata.set('execution', timingInfo);
            return true;
          };
          cell.outputArea.future.registerMessageHook(recordTimingHook);
        } else {
          model.metadata.delete('execution');
        }
        // Save this execution's future so we can compare in the catch below.
        future = cell.outputArea.future;
        const msg = (await msgPromise)!;
        model.executionCount = msg.content.execution_count;
        if (recordTiming) {
          const timingInfo = Object.assign(
            {},
            model.metadata.get('execution') as any
          );
          const started = msg.metadata.started as string;
          // Started is not in the API, but metadata IPyKernel sends
          if (started) {
            timingInfo['shell.execute_reply.started'] = started;
          }
          // Per above, the 5.0 spec does not assume date, so we estimate is required
          const finished = msg.header.date as string;
          timingInfo['shell.execute_reply'] =
            finished || new Date().toISOString();
          model.metadata.set('execution', timingInfo);
        }
        return msg;
      } catch (e) {
        // If we started executing, and the cell is still indicating this
        // execution, clear the prompt.
        if (future && !cell.isDisposed && cell.outputArea.future === future) {
          cell.setPrompt('');
        }
        throw e;
      }
    
    }
}

/**
 * Activate the extension.
 *
 * @param app Main application object
 */
function activate(app: JupyterFrontEnd): void {
    app.docRegistry.addWidgetExtension('Notebook', new BranchButtonExtension());
}


export default plugin;
