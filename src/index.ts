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
import { PanelLayout, Panel } from '@lumino/widgets';

import { CodeCell, Cell } from '@jupyterlab/cells';
import { ISessionContext } from '@jupyterlab/apputils';
import { Kernel, KernelMessage } from '@jupyterlab/services';
import {
	OutputArea,
} from '@jupyterlab/outputarea';
import { MyOutputArea } from './outputarea';
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
import { ICommandPalette } from '@jupyterlab/apputils';
import { NotebookActions } from '@jupyterlab/notebook';

import {
	standardRendererFactories as initialFactories,
	RenderMimeRegistry
} from '@jupyterlab/rendermime';

const CELL_OUTPUT_AREA_CLASS = 'jp-Cell-outputArea';

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
			break;
		case 'width':
			cell.node.style.width = args.newValue as string;
			break;
		case 'branchList':
			const rendermime = new RenderMimeRegistry({ initialFactories });
			while(((cell.layout as PanelLayout).widgets[3] as Panel).widgets.length>1){
			(((cell.layout as PanelLayout).widgets[3] as Panel).layout as PanelLayout)?.removeWidgetAt(1);
			}
			console.log((args.newValue as string[]).length, args.newValue as string[]);
			(args.newValue as string[]).forEach((value:string) => {
			const output = ( new MyOutputArea({
				model: cell.model.outputs,
				rendermime: rendermime,
				contentFactory: cell.contentFactory,
			}));
			output.addClass(CELL_OUTPUT_AREA_CLASS);
			console.log(cell.model.id);
			((cell.layout as PanelLayout).widgets[3] as Panel).addWidget(output);

			})
			break;
		default:
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
        CodeCell['execute'] = this.executeUnderNamespace();
       
        // OutputArea.prototype.bindModel = () => void;

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

        const myRunCallback = () => {
          this.myRun(panel);
        }

        const lockCallback = () => {
          this.lock(panel);
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

        const myRunButton = new ToolbarButton({
          className: 'my-run-button',
          label: "My Run Button",
          onClick: myRunCallback,
          tooltip: 'My Run Cell',
        })

        const lockButton = new ToolbarButton({
          className: 'lock-button',
          label: "Lock",
          onClick: lockCallback,
          tooltip: 'Lock Notebook',
        })
        


        panel.toolbar.insertItem(10, 'clearOutputs', button);
        panel.toolbar.insertItem(11, 'fork', forkButton);
        panel.toolbar.insertItem(12, 'hide', hideButton);
        panel.toolbar.insertItem(13, 'branchMdoe', BranchModeButton);
        panel.toolbar.insertItem(14, 'myRun', myRunButton);
        panel.toolbar.insertItem(15, 'lock', lockButton);
        return new DisposableDelegate(() => {
            button.dispose();
            forkButton.dispose();
            hideButton.dispose();
            BranchModeButton.dispose();
            myRunButton.dispose();
            lockButton.dispose();
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

    updateBranchInfo(panel: NotebookPanel){
      var prevBranchList: string[] = ["start"];
      var bufferList: string[] = [];
      var lastVisitedCell: Cell | undefined = undefined;

      for (var cell of panel.content.widgets){
        // at the beginning of each row, update prevBranchList
        if (lastVisitedCell===undefined){
          // first row
          prevBranchList=["start"];
          bufferList = [];
        }else if(! cell.model.metadata.get('inWrapper')){
          // not in wrapper
          prevBranchList = bufferList;
          bufferList = [];
        }else if(cell.model.metadata.get('inWrapper') && lastVisitedCell.model.metadata.get('wrapperID')!==cell.model.metadata.get('wrapperID')){
          // first cell of wrapper
          prevBranchList = bufferList;
          bufferList = [];
        }


        const currentID = cell.model.id;
        var currentBranchList = prevBranchList.map((value: string) => {
          return `${value}##${currentID}`;
        })
        cell.model.metadata.set('branchList', currentBranchList);
        cell.model.metadata.set('prevBranchList', prevBranchList);

        if (cell.model.metadata.get('inWrapper')){
          bufferList = bufferList.concat(currentBranchList);
        }else{
          bufferList = currentBranchList;
        }
        lastVisitedCell = cell;
      }
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
        
        // replace all cell onmetadatachange
        for (var c of panel.content.widgets){
          c.model.metadata.changed.connect(newOnMetadataChanged(c as CodeCell));
        }

        // get wrapper
        var wrapperID = activeCell?.model.sharedModel.getMetadata().wrapperID;
        var wrapper = this.sideViewWidget!.model.wrappers[wrapperID];

        // insert new cell to wrapper
        this.sideViewWidget?.model.pushCellToWrapper(newCell, wrapperID);

        // update metadata
        newCell.model.metadata.set('inWrapper', true);
        newCell.model.metadata.set('wrapperID', wrapper.id);


        // update branch information
        this.updateBranchInfo(panel);
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
      var script = `%load_ext jupyter_spaces`;
      panel.context.sessionContext.session?.kernel?.requestExecute({code: script}, true);
    }

    processCode(cell: CodeCell, namespaceID: string): string{
		console.log('not implemented');
		const currentOutputIndex = cell.model.metadata.get('currentOutputIndex') as number;
		const prevBranch = (cell.model.metadata.get('prevBranchList') as string[])[currentOutputIndex];
		const currentBranch = (cell.model.metadata.get('branchList') as string[])[currentOutputIndex]; 
		// before executing the real code, insert code to set namespace with namespaceID
		var startScript = `%%copy_space ${prevBranch} ${currentBranch}`;
		// return cell.model.value.text;
		return `${startScript}\n${cell.model.value.text}`;
    }

    executeUnderNamespace(){
		var scope = this;

		async function execute(
			cell: CodeCell,
			sessionContext: ISessionContext,
			metadata?: JSONObject    
		): Promise<KernelMessage.IExecuteReplyMsg | void> {
			const model = cell.model;
			console.log(scope.sideViewWidget);
			// original method: take cell value as script for execution
			// const code = model.value.text;
			// new method: run cell value in a new namespace
			const code = scope.processCode(cell, 'a');
			console.log(code);
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
		return execute;
    }


    async myRun(panel: NotebookPanel){
		var activeCell = panel.content.activeCell;
		
		// get branch number and id
		// go to the last wrapper/cell and get all branch name

		// check output and branch mapping
		for (var [i, o] of ((activeCell?.layout as PanelLayout).widgets[3] as Panel).widgets.entries()){
			if (o.hasClass('jp-OutputCollapser')) continue;

			(o as MyOutputArea).bindModel();
			activeCell?.model.metadata.set('currentOutputIndex', i-1);
			await NotebookActions.run(panel.content, panel.sessionContext);
			(o as MyOutputArea).deBindModel();

		}


		return;
    }

    lock(panel: NotebookPanel){
		alert('Any changes on the cells above will not be updated in this instance.')
    }

}

/**
 * Activate the extension.
 *
 * @param app Main application object
 */
function activate(app: JupyterFrontEnd, palette: ICommandPalette): void {
    app.docRegistry.addWidgetExtension('Notebook', new BranchButtonExtension());

}


export default plugin;
