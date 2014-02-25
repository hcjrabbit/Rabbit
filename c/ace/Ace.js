/**
 * Auhor: chengjun.hecj
 * Descript:
 */
function Ace(options){
    var _self = this;
    _self.options = global.$.extend({

    },options);
    _self.id = _self.options.id;
    _self._createEl(_self.id,_self.options.mode);
    _self.editor = global.ace.edit('editor-'+_self.id);
    _self.editSession = _self.editor.getSession();
    _self.editor.setTheme('ace/theme/' + global.settings.appearance.theme);
    // enable autocompletion and snippets
    _self.editor.setOptions({
        enableBasicAutocompletion: true,
        enableSnippets: true
    });
    _self.editSession.setUseSoftTabs(true);
    _self.editSession.setUseWrapMode(true);
    _self.editor.setValue(_self.options.content,-1);
    _self.editSession.setMode('ace/mode/' + _self.options.mode);

    //实时试图
    var doc = global.$('#boxId-'+_self.id+' .editor_view').find('iframe')[0].contentWindow.document;
    doc.open();
    doc.write("");
    doc.write(_self.options.content);
    doc.close();

    global.$('#' + _self.id).show();
    _self.setBoxHeight();
    _self._bindEvent();
    _self.options.otherCallback(_self.editor);
}
Ace.prototype = {
    _createEl : function(id,mode){
        var _self = this;
        global.$('#main-box').prepend(new global.EJS({url: 'template/editor.ejs'}).render({
            data : {
                id : id,
                type : mode,
                name :_self.options.name
            }
        }));

    },
    _bindEvent : function(){
        var _self = this;
        _self.editSession.on('change',function(){

            if(!_self.isEditorBindChange)
                return;
            _self.options.changeCallback();
        });
        _self.editor.on('focus', function(){
            _self.options.focusCallback();
            _self.isEditorBindChange = true;
        });
        _self.editSession.selection.on('changeCursor',function(){
            _self.options.cursorChangeCallback(_self.editor.getCursorPosition());
        });
    },
    setBoxHeight : function() {
        var _self = this;
        var newHeight =
            _self.editor.getSession().getScreenLength()
                * _self.editor.renderer.lineHeight
                + _self.editor.renderer.scrollBar.getWidth() + 7;

        $('#editor-'+_self.id).height(newHeight.toString() + "px");
        $('#boxId-'+_self.id +' .editor_view').find('iframe').height((newHeight-7).toString() + "px");
        _self.editor.resize(true);
    }
}
module.exports = Ace;