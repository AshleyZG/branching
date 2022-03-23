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
import {Cell} from '@jupyterlab/cells';

import {
  // ISharedCell,
  YCodeCell
} from '@jupyterlab/shared-models';

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

        const callback = () => {
            this.createWrapper(panel);
        };
        const forkCallback = () => {
            this.fork(panel);
        }
        const hideCallback = () => {
            this.hide(panel);
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


        panel.toolbar.insertItem(10, 'clearOutputs', button);
        panel.toolbar.insertItem(11, 'fork', forkButton);
        panel.toolbar.insertItem(12, 'hide', hideButton);
        return new DisposableDelegate(() => {
            button.dispose();
            forkButton.dispose();
            hideButton.dispose();
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
        // var wrapper = new Wrapper(this.wrapperList.length);
        // var wrapper = new Wrapper(this.sideViewWidget!.model.wrappers.length);
        // this.wrapperList.push(wrapper);
        var wrapper: Wrapper = this.sideViewWidget!.model.createWrapper();
        wrapper.insertCell(activeCell!);
        
        // this.sideViewWidget?.addWrapper(wrapper);

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
        console.log('not implemented');
        // need more check on details here
        var newWidth: string = (100/wrapper.length).toString()+'%';
        newCell.model.metadata.set('inWrapper', true);
        newCell.model.metadata.set('wrapperID', wrapper.id);
        console.log(newCell.model.sharedModel.getMetadata());
        wrapper.cellList.forEach((cell: Cell) => {
            cell.model.metadata.set('width', newWidth);
        })

    }

    /**
     * This function if for user to hide branches. 
     * @param panel 
     */
    hide(panel: NotebookPanel){
        console.log("Not Implemented");
        var activeCell = panel.content.activeCell;

        // get wrapper
        var wrapperID = activeCell?.model.sharedModel.getMetadata().wrapperID;
        
        // hide cell in wrapper
        this.sideViewWidget?.model.hideCellInWrapper(activeCell!, wrapperID);

        // resize cells in the  wrapper
        console.log('not implemented ');
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
