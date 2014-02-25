/**
 * Auhor: chengjun.hecj
 * Descript:
 */

var fs = require('fs'),
    Path = require('path'),
    Gui = require('nw.gui');

global.navigator = navigator;

var errHandle = require('../c/err-catch'),
    Ace = require('../c/ace/Ace'),
    Req = require('../c/contect'),
    Sys = require('../c/sys');

var layoutCode = require('../model/layout-code').layoutCode,
    normalCode = require('../model/normal-code'),
    attrList = require('../model/attr-list'),
    uiDataDefault = require('../model/uiDataDefault');


global.settings = settings = require('../settings');


global.ace = ace;
global.$ = $ = jQuery;
global.dirname = fs.realpathSync('.');
global.errHandle = errHandle;
global.Sys = Sys;
global.EJS = EJS;

var win = Gui.Window.get();
win.maximize();
win.setMinimumSize(800, 500);
var $projects = $('#projects'),
    $aside = $('#aside'),
    $filesTab = $('#filesTab'),
    $attrWrap = $('#attrWrap'),
    $modBox = $('#mod-box'),
    $mainBox = $('#main-box');

var E = {
    init: function () {
        var _self = this;

        _self._initData();
        _self._initAce();
        _self._initTreeRender();
        _self._initBootstrap();
        _self._initDragUI();
        _self._bindEvent();
        _self._getCompents();
    },
    /**
     * 初始化数据
     * @private
     */
    _initData: function () {

        var _self = this;
//                localStorage.Rabbit = '';


        if (!localStorage.Rabbit) {
            _self.Rabbit = {};
        } else {
            _self.Rabbit = JSON.parse(localStorage.Rabbit);
        }
        if (!_self.Rabbit.projects)
            _self.Rabbit.projects = {};

        if (_self.Rabbit.projects.currentProjectName) {
            _self.currentProjectName = _self.Rabbit.projects.currentProjectName;
            _self.currentProject = _self.Rabbit.projects[_self.currentProjectName];
            if (!_self.currentProject.openFiles) {
                _self.currentProject.openFiles = {};
            }
        } else {
            _self.currentProjectName = null;
            _self.currentProject = {
                openFiles: {}
            };
        }

        //数据类型
        _self.MIME = JSON.parse(fs.readFileSync(Path.join(global.dirname, 'c', 'MIME.json'), 'utf8'));
    },
    _bindEvent: function () {
        var _self = this;
        //菜单栏的打开按钮
        $('#open').on('click', function () {
            $('#openDialog').trigger('click');
        });
        //打开窗口事件注册
        $('#openDialog').on('change', function () {
            _self._open($(this).val());
        });
        $('#refresh').bind('click', function (e) {
            location.reload();
            e.stopPropagation();
            return false;
        });
        $('#aside-left,#aside-right').bind('click', function () {
            $aside.toggle();
            $(this).hide();
            if (this.id == 'aside-left')
                $('#aside-right').show();
            else
                $('#aside-left').show();

        });
        $('#modBox-left,#modBox-right').bind('click', function () {

            $(this).hide();
            if (this.id == 'modBox-left') {
                $modBox.attr('style', 'display:block;');
                $('#modBox-right').show();
                setTimeout(function () {
                    $('#modBox-selectMode').toggle();
                    $('#mod-box-layout-box').toggle();
                }, 200)
            } else {
                $('#modBox-selectMode').toggle();
                $('#mod-box-layout-box').toggle();
                $modBox.attr('style', '-webkit-flex: 0 0 20px;display:block;');
                $('#modBox-left').show();
            }


        });
        $attrWrap.find('.clicky').bind('click', function (e) {
            e.stopPropagation();
            var $this = $(this),
                $next = $this.next();
            $next.toggle();
            $this.find('i').html($next.css('display') == 'none' ? '展开' : '收缩');
        });
        $(document).bind('click', function (e) {
            if (!(typeof($(e.target).attr("editable")) != "undefined" || $(e.target).closest('[editable]').length != 0 || $(e.target).closest('.attr_wrap').length != 0)) {
                $mainBox.find('.focus').removeClass('focus');

                //如果有积木盒子页面显示在那
                var $currentBox = $('#boxId-' + _self.currentProject.currentFileId);
                $currentBox.find('.tmpDivCloseWillDel').hide();

                if ($currentBox.find('.editor_jimu').css('display') == 'block') {
                    E._attrWrapContentRender(attrList['body'], $.extend({}, uiDataDefault, $currentBox.find('.body').data('uidata')), null, true);
                }
            }
        });
        $('#newFile').bind('click', function () {
            if ($('#newEditor').length > 0)return;
            if (!E.currentProjectName) {
                var a = -1;
                for (var i in E.Rabbit.projects) a++;
                if (a > 0)
                    E._messageHandle($('.openProject'));
                else
                    E._messageHandle($('.openDirectory'));
            } else {
                if (E.currentProject.currentFileId)
                    $('#boxId-' + E.currentProject.currentFileId).find('.editor-name').click();
                $mainBox.prepend(new EJS({url: 'template/newEditor.ejs'}).render({
                    data: {
                        fileTypes: E.MIME
                    }
                }));
                $mainBox.scrollTop(0);
                $('#isJimuPage').bind('click', function () {
                    if (this.checked)
                        $('#fileType').val('.html')[0].disabled = true;
                    else
                        $('#fileType').removeAttr('disabled');
                });

                $('.newFileMessage').slideDown('slow');
            }
        });

        $('.messenger .cancel').bind('click', function (e) {
            e.stopPropagation();
            $(this).closest('.messenger').slideUp('slow');
        });
        $('.messenger .doIt').bind('click', function (e) {
            e.stopPropagation();
            $(this).closest('.messenger').slideUp('slow');
        });
        $('.openProject .doIt').bind('click', function (e) {
            $aside.find('.projectA').eq(0).click();
        });
        $('.openDirectory .doIt').bind('click', function (e) {
            $('#open').click();
        });
        $('.newFileMessage .cancel').bind('click', function (e) {
            $('#newEditor').remove();
        });
        $('.newFileMessage .doIt').bind('click', function (e) {
            var content = '',
                fileType = $('#fileType').val(),
                fileName = $('#newFileName').val() + fileType,
                path = E.currentProject.path + '/' + fileName,
                id = 'f' + Math.floor(Math.random() * 10000 + 1);

            $aside.find('[data-name=' + E.currentProjectName + ']').find('.projectItemFiles').append(new EJS({url: 'template/treeNode.ejs'}).render({
                data: {
                    name: fileName,
                    path: path,
                    isFile: true,
                    id: id
                }}));
            E._treeBindEvent();
            if ($('#isJimuPage')[0].checked)
                content = new EJS({
                    url: 'template/newJiMuTemplate.ejs'
                }).render();
            fs.writeFile(path, content, function (err) {
                if (err) throw err;
                E.currentProject.currentFileId = id;
                $('#newEditor').remove();
                E._openHandle(content, id, path, function () {
                    E._renderFilesTab();
                    var $boxId = $('#boxId-' + _self.currentProject.currentFileId);
                    $boxId.find('.editorMain').show();
                    $boxId.find('.viewSelect').show();
                    $boxId.find('.viewInBrowser').show();
                    E.currentEditor = E.editors[E.currentProject.currentFileId];
                });
            });
        });
    },
    /**
     * 初始化bootstrap组建
     * @private
     */
    _initBootstrap: function () {
        $('#modBox-selectMode').tab('show')
    },
    /**
     * 初始化jquery yi组建
     * @private
     */
    _initDragUI: function () {
        var _self = this;
        _self._initModBoxSingleDragUI($('#mod-box-layout-box-content').find('[data-codeType]'));
        _self._initModBoxSingleDragUI($('#mod-box-normal-box-content').find('[class*=span]'));

    },
    /**
     * 初始化MODBOX里面的拖动对象
     * @param ui
     * @private
     */
    _initModBoxSingleDragUI: function (ui) {
        var _self = this;
        ui.draggable({

            start: function (e, ui) {
                var $drag = $(e.target),
                    $clone = $drag.clone();


                var css = 'position:absolute;';
                if ($clone.hasClass('show-grid'))
                    css += 'top:' + ($drag.index() * 50 - 10).toString() + 'px;';
                else
                    css += 'top:0;left:' + ($drag.index() * ($drag.width() + 10) - 9).toString() + 'px;';
                $clone
                    .removeClass('ui-draggable-dragging')
                    .attr('style', css);
                $drag.css('z-index', '999').after($clone);
                E.modBoxDragUi = $clone;
                _self._initModBoxSingleDragUI($clone);
            },
            stop: function (e, ui) {
                E.modBoxDragUi.attr('style', 'position:relative');
                $(e.target).remove();
            }
        });
    },
    /**
     * 初始化接受拖动对象
     * @param ui
     * @private
     */
    _initDropUI: function (ui) {
        ui.droppable({
            greedy: true, //阻止拖放事件向上冒泡
            drop: function (e, ui) {
                var $code,
                    $drop = $(e.target),
                    $drag = ui.helper,
                    codeType = $drag.data('codetype'),
                    id = Math.floor(Math.random() * 10000 + 1);

                var isLayout = codeType.indexOf('L-') > -1 && $drag.hasClass('show-grid');


                //布局组件
                if (isLayout)
                    $code = $(layoutCode[codeType.replace('L-', '')]);
                //普通组件
                else if (codeType.indexOf('N-') > -1)
                    $code = $(normalCode[codeType.replace('N-', '')]);
                else
                //自定义组件
                    $code = $($drag.find('.customCompentCode').html());


                $code[0].id = id;

                if ($drop.hasClass('body'))
                    $drop.find('.tmpDivCloseWillDel').before($code);
                else
                    $drop.append($code);

                $drop.find('.focus').removeClass('focus');


                //布局组件
                if (isLayout || $drag.data('codetype') == 'N-FORM' || $drag.data('codetype') == 'CUSTOM')
                    E._initDropUI($('#' + id).children('[editable]'));
                else
                    E._initEveryBodyUi($('#' + id));


            },
            over: function (e, ui) {
                $(e.target).addClass('focus');
            },
            out: function (e, ui) {
                $(e.target).removeClass('focus');
            }
        });
        E._initEveryBodyUi(ui);
    },
    /**
     *
     * @param ui
     * @private
     */
    _initEveryBodyUi: function (uis) {
        uis.unbind().bind('click', function (e) {
            e.stopPropagation();
            e.preventDefault();
            var $this = $(this),
                css = $this.data('uidata'),
                $attrContent = $attrWrap.find('.attr_content'),
                $boxId = $('#boxId-' + E.currentProject.currentFileId),
                uitype = $this.data('uitype');
            $boxId.find('.tmpDivCloseWillDel').hide();
            if ($this.hasClass('focus')) {
                $this.removeClass('focus');
                $attrContent.css('display') == 'block' && $attrWrap.find('.clicky').click();
                E._attrWrapContentRender(attrList['body'], $.extend({}, uiDataDefault, $this.closest('.body').data('uidata')), null, true);
            } else {
                $boxId.find('.focus').removeClass('focus');
                $this.addClass('focus');
                if (!$this.hasClass('body'))
                    E._uiDelHandle($this);
                E._attrWrapContentRender(attrList[uitype], $.extend({}, uiDataDefault, css), $this.parent().hasClass('row-fluid') ? ['grid'] : false);
                $attrWrap.show();
                $attrContent.css('display') == 'none' && $attrWrap.find('.clicky').click();
            }
            return false;
        });

    },
    /**
     * 属性BOX内容填充
     * @param attrLists
     * @param cssData
     * @private
     */
    _attrWrapContentRender: function (attrLists, cssData, optionLists, isPage) {
        var $attrContent = $attrWrap.find('.attr_content').html('');
        $('#attrWrapName').html(isPage ? '页面' : '元素');
        $.isArray(optionLists) && (attrLists = attrLists.concat(optionLists));
        attrLists.forEach(function (item) {
            $attrContent.append(new EJS({url: 'template/attrBox/' + item + '.ejs'}).render({
                data: cssData
            }));
        });
        //属性框
        $attrContent.find('input,select').change(E._attrBoxChange);
        $attrContent.find('button').click(E._attrBoxControl);
    },
    /**
     * 文件树事件绑定
     * @private
     */
    _treeBindEvent: function () {
        var _self = this;
        $projects.find('li.projectItem > a.projectA').unbind().bind('click', function (e) {
            var $this = $(this);

            if (e.target.nodeName == 'I') {
                $filesTab.html('');
                $mainBox.html('');
                E.currentProjectName = null;
                E.currentProject = null;
                delete _self.Rabbit.projects[$this.parent().data('name')];
                $this.parent().remove();
                _self._resetLocalStorage();

                E._totalProjects();
                return;
            }


            $filesTab.html('');
            $mainBox.html('');
            if ($this.next().css('display') == 'none') {
                $projects.find('ul.projectItemFiles').hide();
                $projects.find('a.projectA').removeClass('active');
                $this.next().show();
                E.currentProjectName = $this.parent().data('name');
                E.currentProject = E.Rabbit.projects[E.currentProjectName];
                _self._initFilesTab();
            } else {
                E.currentProjectName = '';
                E.currentProject = null;
                $this.next().hide();
            }

            _self._resetLocalStorage();
            $this.toggleClass('active');

        });
        $projects.find('li.projectItem ul.projectItemFiles').find('a').unbind().bind('click', function () {
            var $this = $(this),
                $parent = $this.parent();
            //如果是文件夹则展开
            if ($parent.hasClass('directory'))
                $parent.toggleClass('open');

            //否则打开文件
            else {
                //如果文件没有打开或着已打开没有被focs
                if ($this.data('id') != _self.currentProject.currentFileId) {
                    _self.currentProject.currentFileId = $this.data('id');

                    //如果文件未打开则打开文件
                    if (!_self.currentProject.openFiles[$this.data('id')]) {
                        $mainBox.find('.editorMain').hide();
                        _self._openFile(_self.currentProject.currentFileId, $this.find('.path').val(), function () {
                            _self._renderFilesTab();
                            $('#boxId-' + _self.currentProject.currentFileId).find('.editorMain').show();
                            $('#boxId-' + _self.currentProject.currentFileId).find('.viewSelect').show();
                            $('#boxId-' + _self.currentProject.currentFileId).find('.viewInBrowser').show();
                            _self.currentEditor = _self.editors[_self.currentProject.currentFileId];
                        });
                    }
                    else//如果文件已经打开，只是没有被focs，那么focs这个文件
                        $filesTab.find('a[data-id=' + $this.data('id') + ']').trigger('click');
                }
            }
            return false;
        });
    },
    /**
     * 已打开文件列表事件绑定
     * @private
     */
    _filesTabBindEvent: function () {
        $filesTab.find('a').unbind().bind({
                'click': function () {
                    var $this = $(this);
                    E.currentProject.currentFileId = $this.data('id');

                    if ($this.hasClass('active'))return;

                    $filesTab.find('a').removeClass('active');
                    $this.addClass('active');

                    $mainBox.find('.editorMain').hide();
                    var $boxId = $('#boxId-' + E.currentProject.currentFileId);
                    $boxId.find('.editorMain').show();
                    $boxId.find('.viewSelect').show();
                    $boxId.find('.viewInBrowser').show();

                    if ($boxId.find('.editor_jimu').css('display') == 'block') {
                        $attrWrap.show();
                        $modBox.show();
                    }

                    $('#main-box').scrollTop($('#boxId-' + E.currentProject.currentFileId).index() * 65);

                    E.currentEditor = E.editors[E.currentProject.currentFileId];
                    E._resetLocalStorage();
                },
                'dblclick': function () {
//                    $('#menu-project').click();
                }
            }

        );
    },
    /**
     * 已打开文件列表事件绑定
     * @private
     */
    _editorBindEvent: function () {
        $mainBox.find('.editor').find('a.close').unbind().bind('click', function () {
            var $parent = $(this).closest('.editor'),
                fileId = $parent.data('id');
            $filesTab.find('[data-id=' + fileId + ']').remove();
            $parent.remove();
            delete E.currentProject.openFiles[fileId];
            if (fileId == E.currentProject.currentFileId) {
                E.currentProject.currentFileId = '';
                $modBox.hide();
                $attrWrap.hide();
            }
            E._resetLocalStorage();
        });

        $mainBox.find('.editor').find('a.viewSelect').unbind().bind('click', function (e) {
            $(this).find('.notification').toggle();
            e.stopPropagation();
            return false;
        });
        $('#uploadImage').bind('click', function (e) {
            window.open('http://cms.cn.alibaba-inc.com/page/upload/flash_upload.html', {
                position: 'center'
            }, '_blank', 'screenX=0,screenY=0,width=1024,height=500');
            e.stopPropagation();
            return false;
        });

        $mainBox.find('.editor').find('a.viewInBrowser').unbind().bind('click', function (e) {
            e.stopPropagation();

            if ($(this).parent().find('.viewSelect').find('.type').val() == 4)
                E._jimuToCode(function () {
                    window.open(E.currentProject.openFiles[E.currentProject.currentFileId].path, {
                        position: 'center'
                    }, '_blank', 'screenX=0,screenY=0,width=1024,height=500');
                });
            else
                window.open(E.currentProject.openFiles[E.currentProject.currentFileId].path, {
                    position: 'center'
                }, '_blank', 'screenX=0,screenY=0,width=1024,height=500');

            return false;
        });
        $mainBox.find('.editor').find('a.createLastFile').unbind().bind('click', E._createLastFile);
        $mainBox.find('.editor').find('a.jimuSave').unbind().bind('click', function (e) {
            e.stopPropagation();

            E._jimuToCode();

            return false;
        });
        $mainBox.find('.editor').find('.notification li').unbind().bind('click', function (e) {
            var $this = $(this),
                type = $this.data('type'),
                $parent = $this.closest('.viewSelect'),
                $editorMain = $this.closest('.editor').find('.editorMain'),
                $boxId = $('#boxId-' + E.currentProject.currentFileId);


            $attrWrap.hide();
            if ($parent.find('.type').val() == type)return;
            $boxId.find('.jimuSave').hide();
            $boxId.find('.createLastFile').hide();

            if (type != 4) {
                $editorMain.children().hide();
                $attrWrap.hide();
                $modBox.hide();
            }
            switch (type) {
                case 1 :
                    $editorMain.find('div[data-type=code]').show();
                    break;
                case 2 :
                    $editorMain.find('div[data-type=view]').show();
                    break;
                case 3 :
                    $editorMain.find('div[data-type=code]').show();
                    $editorMain.find('div[data-type=view]').show();
                    break;
                case 4 :
                    if (E.currentEditor.getValue().indexOf('chargeThePageCando') == -1) {
                        E._messageHandle($('.msg_delete'));
                        return;
                    } else {
                        $editorMain.children().hide();
                        $aside.css('display') != 'none' && $editorMain.prev('.editor-name').trigger('dblclick');
                        $editorMain.find('div[data-type=jimu]').show();
                        E._attrWrapContentRender(attrList['body'], $.extend({}, uiDataDefault, $boxId.find('.body').data('uidata')), null, true);
                        $attrWrap.show();
                        $modBox.show();
                        $boxId.find('.jimuSave').show();
                        $boxId.find('.createLastFile').show();
                        E._codeToJimu();
                    }
                    break;
                case 5 :
                    break;
            }
            if (type != 4)
                E._jimuToCode();

            $parent.find('.notification').toggle();
            $parent.find('.type').val(type);
            $parent.find('.title').html($this.text());
            e.stopPropagation();
            return false;
        });
        var clickTm;
        $mainBox.find('.editor-name').unbind().bind({
            'click': function () {
                clearTimeout(clickTm);
                var $this = $(this);
                clickTm = setTimeout(function () {
                    if ($this.next().css('display') !== 'none') {
                        $this.find('.viewSelect').hide();
                        $this.find('.viewInBrowser').hide();
                        $this.next().hide();
                        E.currentProject.currentFileId = '';
                        $filesTab.find('.active').removeClass('active');
                        $attrWrap.hide();
                        $modBox.hide();
                    } else
                        $filesTab.find('a[data-id=' + $this.parent().data('id') + ']').click();

                    E._resetLocalStorage();
                }, 150);
            },
            'dblclick': function () {
                clearTimeout(clickTm);
                $aside.toggle();
                $('#aside-left').toggle();
                $('#aside-right').toggle();
            }
        });

    },
    /**
     *
     * 属性窗口控制按钮
     * @private
     */
    _attrBoxControl: function (e) {
        e.stopPropagation();
        e.preventDefault();
        var $this = $(this),
            type = $this.data('type'),
            $boxId = $('#boxId-' + E.currentProject.currentFileId);
        switch (type) {
            case 'goToParent' :
                var $parentEditable = $boxId.find('.focus').parents('[editable]');
                if ($parentEditable.length > 0)
                    $parentEditable.eq(0).click();
                break;
            default :
                break;
        }
        return;
    },
    /**
     * 属性窗口属性改变时
     * @private
     */
    _attrBoxChange: function () {
        var $this = $(this),
            $parent = $this.parents('[data-type]').eq(0),
            $currentUI = $('#boxId-' + E.currentProject.currentFileId).find('.focus'),
            value = $this.val(),
            css = $currentUI.data('uidata') || {};

        if ($this.hasClass('inputColor'))
            $this.prev().val($this.val());

        //当没有元素被选中时
        ($currentUI.length == 0) && ($currentUI = $('#boxId-' + E.currentProject.currentFileId).find('.body'));

        if ($parent.length > 0) {
            //当该ui没有这个属性时，给它赋值默认值
            if (!css[$parent.data('type')]) {
                var tmp = {};
                $.each($parent.find('[data-type]'), function (i, item) {
                    item = $(item);
                    if (item.data('type') == 'weight' && $parent.data('type') == 'font')
                        tmp[item.data('type')] = item[0].checked;
                    else
                        tmp[item.data('type')] = item.val();
                });
                css[$parent.data('type')] = tmp;
            } else {
                if ($this.data('type') == 'weight' && $parent.data('type') == 'font')
                    css[$parent.data('type')][$this.data('type')] = $this[0].checked;
                else
                    css[$parent.data('type')][$this.data('type')] = value;
            }
        } else
            css[$this.data('type')] = value;
        $currentUI.attr('data-uidata', JSON.stringify(css));
        E._dataAttrChangeListenChangeCss($currentUI);
    },
    /**
     * 当ui的data-改变时，改变该ui的style属性，使其能实时视图
     * @private
     */
    _dataAttrChangeListenChangeCss: function (ui) {
        var cssData = ui.data('uidata'),
            nodeName = ui[0].nodeName,
            str = '';
        for (var name in cssData) {
            var value = cssData[name];
            switch (name) {
                case 'background':
                    if ($.trim(value.color)) {
                        str += 'background-color:' + value.color + ';';
                    }
                    if ($.trim(value.image))
                        str += 'background:url(' + value.image + ') ' + value.type + ' ' + value.x + ' ' + value.y + ';';
                    break;
                case 'width' :
                    if (value)
                        str += 'width:' + (value || 0) + ';';
                    if (nodeName == 'IMG') {
                        var src = 'http://wd.alibaba-inc.com/i/' + parseInt(value) + '-' + parseInt(cssData.width || ui.width()) + '.png';
                        ui[0].src = src;
                        $attrWrap.find('[data-type="src"]').val(src);

                    } else if ((nodeName == 'SPAN' || nodeName == 'A') && value != '') {
                        str += 'display:block;'
                    }
                    break;
                case 'line' :
                    if (value.height != '')
                        str += 'line-height:' + value.height + ';';
                    else
                        str += 'line-height:normal;';
                    break;
                case 'height' :

                    if (nodeName == 'IMG') {
                        var src = 'http://wd.alibaba-inc.com/i/' + parseInt(cssData.width || ui.width()) + '-' + parseInt(value) + '.png';
                        ui[0].src = src;
                        $attrWrap.find('[data-type="src"]').val(src);
                    } else if ((nodeName == 'SPAN' || nodeName == 'A') && value != '' && str.indexOf('display') == -1) {
                        str += 'display:block;'
                    }
                    if (value) {
                        str += 'height:' + value + ';';
                        str += 'min-height:0;';
                    }
                    break;
                case 'margin' :
                    if (parseInt(value.top) == parseInt(value.right) && parseInt(value.right) == parseInt(value.bottom) && parseInt(value.bottom) == parseInt(value.left))
                        str += 'margin:' + cpuTheNumber(value.top);
                    else
                        str += 'margin:' + cpuTheNumber(value.top) + ' ' + cpuTheNumber(value.right) + ' ' + cpuTheNumber(value.bottom) + ' ' + cpuTheNumber(value.left) + ' ' + ';';
                    break;
                case 'border' :
                    if (value.topSize > 0)
                        str += 'border-top-width:' + value.topSize + 'px;border-top-color: ' + value.topColor + ';border-top-style:' + value.topStyle + ' ' + ';';
                    if (value.rightSize > 0)
                        str += 'border-right-width:' + value.rightSize + 'px;border-right-color: ' + value.rightColor + ';border-right-style:' + value.rightStyle + ' ' + ';';
                    if (value.bottomSize > 0)
                        str += 'border-bottom-width:' + value.bottomSize + 'px;border-bottom-color: ' + value.bottomColor + ';border-bottom-style:' + value.bottomStyle + ' ' + ';';
                    if (value.leftSize > 0)
                        str += 'border-left-width:' + value.leftSize + 'px;border-left-color: ' + value.leftColor + ';border-left-style:' + value.leftStyle + ' ' + ';';

                    break;
                case 'textAlign':
                    str += 'text-align:' + value + ';';
                    break;
                case 'font' :
                    str += 'font-size:' + value.size + 'px;font-family:' + value.family + ';font-style:' + value.style + ';';
                    if (value.weight)
                        str += 'font-weight:bold;';
                    if (value.color)
                        str += 'color:' + value.color + ';';
                    break;
                case 'text' :
                    str += 'text-align:' + value.align + ';text-decoration:' + value.decoration + ';';
                    break;
                case 'padding' :
                    str += 'padding:' + cpuTheNumber(value.top) + ' ' + cpuTheNumber(value.right) + ' ' + cpuTheNumber(value.bottom) + ' ' + cpuTheNumber(value.left) + ' ' + ';';
                    break;
                case 'position' :
                    if (value.type != 'static')
                        str += 'position:' + value.type + ';';
                    if (value.x != '')
                        str += value.xType +':' + value.left + 'px;';
                    if (value.y != '')
                        str += value.yType +':' + value.top + 'px;';
                    break;
                case 'inputType' :
                    ui.attr('type', value);
                    break;
                case 'grid' :
                    if (value.widthType > 0) {
                        ui.removeClass(ui.attr('class').match(new RegExp(/span[\d]+/))[0]).addClass('span' + value.widthType);
                    }
                    break;
                case 'checked' :
                    if (value == 'YES')
                        ui.attr('checked', 'checked');
                    else
                        ui.removeAttr('checked');
                case 'value' :
                    ui.val();
                    break;
                case 'textContent' :
                    value = (value || '文本内容');
                    if (nodeName != 'BUTTON') {
                        if (ui.children('span.uiContent').length > 0)
                            ui.children('span.uiContent').html(value);
                        else
                            ui.prepend('<span class="uiContent">' + (value ) + '</span>');
                    } else
                        ui.text(value);

                    break;

                default :
                    if (value.length > 0)
                        ui.attr('alt', value);
                    break;
            }
        }
        function cpuTheNumber(str) {
            if (str == '')
                str = 0;
            else if (!isNaN(str))
                str = str.indexOf('px') > -1 ? str : ($.trim(str) + 'px');
            return str;
        }

        ui.attr('style', str + cssData.customCode);
        E._uiDelHandle(ui);
    },
    /**
     * 积木视图代码装换为代码模式代码
     * @private
     */
    _jimuToCode: function (callback) {


        var jimuCode = E._changejimuCode();

        E.currentEditor.setValue(jimuCode.replace(/\"{&quot;/g, '\'{&quot;').replace(/&quot;}\"/g, '&quot;}\'').replace(/&quot;}}\"/g, '\"}}\'').replace(/&quot;/g, '"'));

        E._resizeTheEditor();
        E._saveFile(callback);
    },
    /**
     * 中间切换函数
     * @private
     */
    _changejimuCode: function (createStyleToClass) {
        var $box = $('#boxId-' + E.currentProject.currentFileId),
            jimuCode = '<!DOCTYPE html><html>',
            $clone = $box.find('.body').clone();
        $clone.find('.tmpDivCloseWillDel').remove();
        if ($box.find('.headCode').val().length > 0)
            jimuCode += $box.find('.headCode').val();
        else
            jimuCode += new EJS({url: 'template/headCode.ejs'}).render({data: {
                title: ''
            }});
        if (createStyleToClass) {
            var newObj = createStyleToClass($clone, jimuCode);
            $clone = newObj.$e;
            jimuCode = newObj.code;
        }

        jimuCode += '\n<body data-uidata="' + JSON.stringify($clone.data('uidata')) + '" style="' + ($clone.attr("style") || '') + '">';
        jimuCode += $clone.html().replace(/ui\-droppable|focus/g, '').replace(/(<\/[\d\D]+>)(<[\d\D]+>)/g, '$1\n$2');
        jimuCode += '</body>\n</html>';
        return jimuCode;
    },
    /**
     * 代码模式代码转换为积木视图代码
     * @private
     */
    _codeToJimu: function () {
        var $box = $('#boxId-' + E.currentProject.currentFileId),
            content = E.currentEditor.getValue(),
            $body = $box.find('.body');

        $box.find('.headCode').val(content.match(/<head>[\d\D]*<\/head>/g));


        var bodyCssReg = new RegExp("<body.*data-uidata='([^\"]*)'>", 'g'),
            bodyStyleReg = new RegExp('<body.*style="([^\"]*)">', 'g'),
            bodyContent = new RegExp("<body[^>]*>([\\d\\D]*)</body>", 'g');

        content.match(bodyCssReg);
        $body.data('css', RegExp.$1);
        content.match(bodyStyleReg);
        $body.attr('style', RegExp.$1);
        content.match(bodyContent);
        $body.html(RegExp.$1);
        $body.append('<span class="tmpDivCloseWillDel"><i class="icon-remove"></i></span>');
        $body.find('.tmpDivCloseWillDel').unbind().bind('click', function () {
            $(this).hide();
            $('#boxId-' + E.currentProject.currentFileId).find('.body').find('.focus[editable]').remove();
            $attrWrap.find('.attr_content').css('display') == 'block' && $attrWrap.find('.clicky').click();
        });
        E._initDropUI($body);
        E._initDropUI($body.find('[editable]'));
    },
    /**
     * 初始化文件树渲染
     * @private
     */
    _initTreeRender: function () {
        for (var name in E.Rabbit.projects) {
            if (name != 'currentProjectName')
                this._openDirectory(E.Rabbit.projects[name].path, true);
        }

    },
    /**
     * 初始化打开文件列表
     * @private
     */
    _initFilesTab: function () {
        var _self = this;
        this._renderFilesTab();
        var files = _self.currentProject.openFiles;
        for (var key in files) {
            var item = files[key];
            E._openFile(item.id, item.path, function (editor, id) {
//                var cursorData = files[key].cursorStatus;
//                if (cursorData)
//                    editor.gotoLine(cursorData.row, cursorData.column, item.id == E.currentProject.currentFileId);

            }, true);

        }
    },
    /**
     * 初始化编辑区域
     * @private
     */
    _initAce: function () {
        global.ace.require("ace/ext/language_tools");
    },
    /**
     * 打开文件或者打开文件夹
     * @param path
     * @private
     */
    _open: function (path) {
        fs.stat(path, function (err, stats) {
            if (err) {
                errHandle['openFileErr']();
                return;
            }
            if (stats.isDirectory()) {
                E._openDirectory(path);
            } else {

            }
        });
    },
    /**
     * 打开项目文件夹
     * @param path
     * @private
     */
    _openDirectory: function (path, isEach) {
        $('.opening').slideDown('slow');

        var currentProject = {
            path: path,
            isOpen: true,
            name: Path.basename(path),
            files: {

            },
            openFiles: {}
        };

        eachDirectory(path);

        /**
         * 迭代文件树数据整个
         * @param path
         * @param parent
         */
        function eachDirectory(path1) {
            var files = fs.readdirSync(path1);
            var tmpArr = [];
            files.forEach(function (item) {
                tmpArr.push(Path.join(path1, item));
            });
            files = E._sortTree(tmpArr);
            files.forEach(function (item) {
                var tmpArr = item.replace(path + Path.sep, '').split(Path.sep),
                    stat = fs.statSync(item);
                if (stat.isFile())
                    tmpArr.pop();
                var tmpStr = tmpArr.length > 0 ? 'currentProject["files"]["' + tmpArr.join('"]["') + '"]' : 'currentProject["files"]';

                if (Sys == 'Windows')
                    item = item.replace(/\\/g, '\\\\');
                if (stat.isDirectory()) {
                    eval('(' + tmpStr + '={"_Rabbit_directory_path":"' + item + '","isOpen" : false})');
                    eachDirectory(item);
                } else {
                    eval('if(!' + tmpStr + '["files"])' + tmpStr + '["files"]=[]');
                    eval('(' + tmpStr + '["files"].push({path:"' + item + '",isOpen : false, id : "f' + Math.floor(Math.random() * 10000 + 1) + '"}))');
                }
            });
        }

        if (!isEach) {
            E.currentProjectName = Path.basename(path);
            E.currentProject = currentProject;
            E._resetLocalStorage();
        }


        $filesTab.html('');
        $mainBox.html('');

        $projects.find('.projectA').removeClass('active');
        $projects.find('.projectItemFiles').hide();
        this._renderTree(currentProject);

    },
    /**
     * 打开文件
     * @param path
     * @private
     */
    _openFile: function (id, path, callback, isReopen) {
        $('.opening').slideDown('slow');
        fs.readFile(path, {
            encoding: 'utf8'
        }, function (err, data) {
            if (err) {
                errHandle['openFileErr']('');
                delete E.currentProject.openFiles[id];
                if (E.currentProject.currentFileId = id)
                    E.currentProject.currentFileId = '';
                $('.opening').slideUp('slow');
                return;
            }
            E._openHandle(data, id, path, callback, isReopen);
        });

    },
    /**
     * 文件打开处理函数
     * @private
     */
    _openHandle: function (data, id, path, callback, isReopen) {
        if (!E.currentProject.openFiles) {
            E.currentProject.openFiles = {};
        }
        //E.currentProject.openFiles是已打开文件的tabs对象

        if (!isReopen) {
            E.currentProject.openFiles[id] = {
                name: Path.basename(path),
                path: path,
                id: id
            };
        }

        var editor = new Ace({
            id: id,
            name: Path.basename(path),
            content: data,
            mode: E.MIME[(Path.extname(path) || '.txt')],
            changeCallback: E._saveFile,
            focusCallback: E._editorFocusCallback,
            cursorChangeCallback: E._editorCursorChangeCallback,
            otherCallback: function (editor) {
                var $box = $('#boxId-' + id);
                $('#main-box').scrollTop($('#boxId-' + id).index() * 65);
                if (id != E.currentProject.currentFileId)
                    $box.find('.editorMain').hide();
                else {
                    E.currentEditor = editor;
                    $box.find('.viewSelect').show();
                    $box.find('.viewInBrowser').show();
                }

                E._initDropUI($box.find('.jimu_wrap').find('.body'));
                E._editorBindEvent();
            }
        }).editor;


        //当项目之间切换时，展示上次的当前文件
        $('#editor-' + $('#filesTab .active').data('id')).show();
        //保存起来供以后使用
        if (!E.editors) E.editors = {};
        E.editors[id] = editor;

        E._resetLocalStorage();
        $('.opening').slideUp('slow');
        callback && callback(editor, id);
    },
    /**
     * 项目文件树渲染
     * @param data
     * @private
     */
    _renderTree: function (data) {
        var tmpTree = ['<li class="projectItem" data-name="' + data.name + '"> <a href="javascript:;" class="projectA"><h3>' + data.name + '</h3><i class="del icon-remove"></i></a><ul class="projectItemFiles">'];
        eachRender(data.files);
        function eachRender(tmpData) {
            for (var key in tmpData) {
                if (key == '_Rabbit_directory_path' || key == 'isOpen')
                    continue;
                if (!(tmpData[key] instanceof Array)) {
                    //如果是文件夹对象
                    tmpTree.push('<li class="directory ' + (tmpData[key]['isOpen'] ? "open" : "") + '">' + new EJS({url: 'template/treeNode.ejs'}).render({data: {
                        name: key,
                        path: tmpData[key]['_Rabbit_directory_path']
                    }}));
                    tmpTree.push('<ul class="projectFiles hide">');
                    eachRender(tmpData[key]);
                    tmpTree.push('</ul></li>');
                } else {
                    //如果是文件数组，则迭代渲染
                    tmpData[key].forEach(function (item) {
                        tmpTree.push('<li>' + new EJS({url: 'template/treeNode.ejs'}).render({data: {
                            name: Path.basename(item.path),
                            path: item.path,
                            isFile: true,
                            id: item.id
                        }}) + '</li>');
                    });
                }
            }
        }


        tmpTree.push('</li>');
        $projects.prepend(tmpTree.join(' '));
        E._treeBindEvent();
        if ($aside.find('li[data-name="' + E.currentProjectName + '"] > a').length > 0 && !E.isInitProjectClick) {
            E.isInitProjectClick = true;
            $aside.find('li[data-name="' + E.currentProjectName + '"] > a').click();
        }
        $('.opening').slideUp('slow');
        E._totalProjects();
    },
    /**
     * 渲染已打开文件tabs列表
     * @private
     */
    _renderFilesTab: function () {
        var str = '<ul>';
        for (var key in E.currentProject.openFiles) {
            var item = E.currentProject.openFiles[key];
            if (!E.currentProject.openFiles[key])
                continue;
            str += new EJS({url: 'template/openedFilesNode.ejs'}).render({data: {
                name: item.name,
                path: item.path,
                type: Path.extname(item.name).replace('.', ''),
                isCurrent: (E.currentProject.currentFileId == key),
                id: key
            }})
        }
        str += '</ul>';
        $filesTab.html(str);

        E._filesTabBindEvent();
    },
    /**
     * 重排序文件树，默认文件夹在上面
     * @param treeArr
     * @param filesUp
     * @returns {Array}
     * @private
     */
    _sortTree: function (treeArr, filesUp) {
        var tmpArr = [];
        if (!filesUp) {
            treeArr.forEach(function (item) {
                var stat = fs.statSync(item);
                if (stat.isDirectory()) {
                    tmpArr.push(item);
                }
            });
            treeArr.forEach(function (item) {
                var stat = fs.statSync(item);
                if (!stat.isDirectory())
                    tmpArr.push(item);
            });
        } else {
            treeArr.forEach(function (item) {
                var stat = fs.statSync(item);
                if (!stat.isDirectory())
                    tmpArr.push(item);
            });
            treeArr.forEach(function (item) {
                var stat = fs.statSync(item);
                if (stat.isDirectory())
                    tmpArr.push(item);
            });
        }
        return tmpArr;
    },
    /**
     * 重置所有的编辑器的数据，包括局部与全局
     * @private
     */
    _resetLocalStorage: function () {
        //E.projects.currentProjectName 作用与所有的编辑器之间的数据，方便与用户第一次打开之前关闭的最前窗口
        //E.currentProjectName 作用与当前窗口的项目名
        E.Rabbit.projects.currentProjectName = E.currentProjectName;
        E.currentProjectName && (E.Rabbit.projects[E.currentProjectName] = E.currentProject);

        localStorage.Rabbit = JSON.stringify(E.Rabbit);
    },
    _recordDirectoryStatus: function () {

    },

    /**
     * 当编辑器获得焦点时
     * @private
     */
    _editorFocusCallback: function () {
//        $fileTree.find('li.active').removeClass('active').addClass('rightMouse');
    },
    /**
     * 当编辑器鼠标位置变幻时
     * @private
     */
    _editorCursorChangeCallback: function (data) {
//        E.currentProject.openFiles[E.currentProject.currentFileId].cursorStatus = {row: data.row, column: data.column};
//        $('#cursorStatus').html(data.row + ':' + data.column);
//        E._resetLocalStorage();
    },
    _saveFile: function (callback) {
        $('.saving').slideDown('slow');
        fs.writeFile(E.currentProject.openFiles[E.currentProject.currentFileId].path, E.currentEditor.getValue(), "utf8", function () {
            $('.saving').slideUp('slow');
            var doc = $('#boxId-' + E.currentProject.currentFileId + ' .editor_view').find('iframe')[0].contentWindow.document;
            doc.open();
            doc.write("");
            doc.write(E.currentEditor.getValue());
            doc.close();
            E._resizeTheEditor();
            callback && callback();
        });


    },
    /**
     * 编辑的时候重置编辑器的大小
     * @private
     */
    _resizeTheEditor: function () {
        var newHeight =
            E.currentEditor.getSession().getScreenLength()
                * E.currentEditor.renderer.lineHeight
                + E.currentEditor.renderer.scrollBar.getWidth() + 7;

        $('#editor-' + E.currentProject.currentFileId).height(newHeight.toString() + "px");
        $('#boxId-' + E.currentProject.currentFileId + ' .editor_view').find('iframe').height((newHeight - 7).toString() + "px");
        E.currentEditor.resize(true);
    },

    /**
     * 当有文件打开时，定时1秒更新一次内容
     * @returns {boolean}
     * @private
     */
    _currentFileIdSetIntervalUpdate: function () {
//        var _self = this;
//        _self.currentFileIdSetIntervalUpdate = null;
//        if(!_self.currentProject.currentFileId)
//            return false;
//        _self.currentFileIdSetIntervalUpdate = setInterval(function(){
//            _self._openFile(_self.currentProject.currentFileId);
//        },1000);
    },
    /**
     * message handle
     */
    _messageHandle: function (ui) {
        ui.slideDown('slow');
        setTimeout(function () {
            ui.slideUp('slow');
        }, 5000);
    },
    /**
     * ui被点击时，出现删除按钮
     * @private
     */
    _uiDelHandle: function (ui) {
        var offset = ui.offset(),
            $boxId = $('#boxId-' + E.currentProject.currentFileId),
            bodyOffset = $boxId.find('.body').offset();
        $boxId.find('.tmpDivCloseWillDel').css({
            'left': (offset.left - bodyOffset.left - 5).toString() + 'px',
            'top': (offset.top - bodyOffset.top - 8).toString() + 'px'
        }).show();
    },
    /**
     * 统计项目
     * @private
     */
    _totalProjects: function () {
        $('#totalProjects').html($projects.children().length);
    },
    /**
     * 生成最终代码文件
     * @private
     */
    _createLastFile: function (e) {
        e.stopPropagation();
        if (!E.currentProject.currentFileId)
            return;
        var content = E._changejimuCode(E._createStyleToClass);
        if (content.indexOf('chargeThePageCando') == -1)
            E._messageHandle($('.doNotCreateLast'));
        else {
            content = content
                .replace(/data-uitype=\"[^\"]*\"/g, '')
                .replace(/data-uidata=\"[^\"]*\"/g, '')
                .replace(/data-uidata=\'[^\']*\'/g, '')
                .replace(/(class=\"[\S]*)[\s]*([\S]*)\"/g, '$1 $2"')
                .replace(/min-height:0;/g, '')
                .replace(/editable=\"\"/g, '')
                .replace(/editable/g, '')
                .replace(/<input type=\"hidden\" class=\"chargeThePageCando\" value=\"1\">/g, '');
            var path = E.currentProject.openFiles[E.currentProject.currentFileId].path,
                extname = Path.extname(path);
            fs.writeFile(path.replace(extname, '-last') + extname, content, function (err) {
                if (err) throw err;
                E._messageHandle($('.doCreateLastOk'));
            });
        }
        return;
    },
    /**
     * 转换style to class
     */
    _createStyleToClass: function ($clone, code) {
        var styleLabel = '<style type="text/css">\n\r';
        styleLabel += 'body{' + $clone.attr('style') + '}';
        $.each($clone.removeAttr('style').find('[editable]'), function (i, item) {
            var className = 'c' + Math.floor(Math.random() * 10000 + 1);
            item = $(item);
            styleLabel += '\n\r.row-fluid .' + className + ' {' + (item.attr('style') || '') + '}';
            item.addClass(className).removeAttr('style');
        });
        styleLabel += '\n\r</style>';
        code = code.slice(0, -7) + styleLabel + '\n\r</head>';
        return {
            $e: $clone,
            code: code
        }
    },
    /**
     * 连接组件服务器
     * @private
     */
    _getCompents: function () {
//        Req.init({
//            hostname : settings.compents.hostname,
//            path : settings.compents.path,
//            callback : function(data){
//                if(data.length > 0){
//                    var str = '';
//                    data.foEach(function(item,i){
//                        if(i%2 == 0)
//                            str += '<div class="row-fluid show-grid">';
//                        str += '<div class="span6" data-codeType="CUSTOM" title="'+ item.desc +'">' + item.name + '<input type="hidden" class="customCompentCode" value="'+ item.code +'"></div>';
//                        if(i%2 == 1)
//                            str += '</div>';
//                    });
//                    var $wrap = $('#mod-box-custom-box-content');
//                    $wrap.append(str);
//                    //拖动事件绑定
//                    $wrap.find('[class*=span]').draggable( "destroy" );
//                    E._initModBoxSingleDragUI($wrap.find('[class*=span]'));
//                }
//            }
//        });

        var data = [
            {
                name : '浮动',
                desc : '浮动在页面上',
                code : '<div style="position:fixed;_position:absolute;margin-left:50%;width:52px;height:52px;left:0;bottom:160px;" editable data-uidata=\'{"width":"100px","height":"200px","margin":{"top":0,"right":0,"bottom":0,"left":"50%"},"position":{"type":"fixed","yType":"top","xType":"left","x":"0px","y":""}}\' data-uitype="layout"></div>'
            }
        ];


        if(data.length > 0){
            var str = '';
            var $wrap = $('#mod-box-custom-box-content');

            //取消拖动事件绑定
            if($wrap.find('[class*=span]').length > 0)
                $wrap.find('[class*=span]').draggable( "destroy" );
            $.each(data,function(i,item){
                if(i%2 == 0)
                    str += '<div class="row-fluid show-grid">';
                str += '<div class="span6" data-codeType="CUSTOM" title="'+ item.desc +'">' + item.name + '<div  class="customCompentCode hide">'+ item.code +'</div></div>';
                if(i%2 == 1)
                    str += '</div>';
            });
            $wrap.append(str);

            E._initModBoxSingleDragUI($wrap.find('[class*=span]'));
        }
    }
};

E.init();