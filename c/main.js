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
    Sys = require('../c/sys');

global.ace = ace;
global.$ = $ = jQuery;
global.dirname = fs.realpathSync('.');
global.errHandle = errHandle;
global.Sys = Sys;

var win = Gui.Window.get();
win.maximize();
$('#window').height(win.height - 54);  //toolbar有33
var $fileTree = $('#fileTree'),
    $filesTab = $('#filesTab'),
    $main = $('#main');


var E = {
    init: function () {
        var _self = this;

        _self._initData();
        _self._initAce();
        _self._initTreeRender();
        _self._initFilesTab();
        _self._currentFileIdSetIntervalUpdate();

        _self._bindEvent();
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
        global.settings = _self.settings = JSON.parse(fs.readFileSync(Path.join(global.dirname, 'settings', 'default.json'), 'utf8'));
    },
    _bindEvent: function () {
        var _self = this;
        //菜单栏的打开按钮
        $('#toolbar_open').on('click', function () {
            $('#openDialog').trigger('click');
        });

        //打开窗口事件注册
        $('#openDialog').on('change', function () {
            _self._open($(this).val());
        });

        $('#menu-project').on('click', function () {
            var $navigator = $('#navigator'),
                $menuLeftBlock = $('#menuLeftBlock'),
                $main = $('#main');

            $(this).parent().toggleClass('active');
//            $menuLeftBlock.find('.block').hide();
            if (!$navigator.hasClass('hide')) {
                $main.data('marginLeft', $main.css('margin-left'));
                $main.css('margin-left', 0);
            } else {
                $main.css('margin-left', $main.data('marginLeft'));
            }
            $navigator.toggleClass('hide');
        });

        $(document).on('click', function () {
            var $this = $(this);
            if (!$this.closest('li').hasClass('active')) {
                $fileTree.find('li.active').removeClass('active').addClass('rightMouse');
            }
        });

    },
    /**
     * 文件树事件绑定
     * @private
     */
    _treeBindEvent: function () {
        var _self = this,
            $directoryLi = $fileTree.find('li.directory');
        $fileTree.find('a').bind('click', function () {
            var $this = $(this),
                $parent = $this.parent();
            if ($parent.hasClass('active')) {
                //如果是文件夹则展开
                if ($parent.hasClass('directory'))
                    $this.prevAll('span.arrow').click();
                //否则打开文件
                else {
                    //如果文件没有打开或着已打开没有被focs
                    if ($this.attr('data-id') != _self.currentProject.currentFileId) {
                        _self.currentProject.currentFileId = $this.attr('data-id');

                        //如果文件未打开则打开文件
                        if (!_self.currentProject.openFiles[$this.attr('data-id')])
                            _self._openFile(_self.currentProject.currentFileId, $this.nextAll('.path').val(), function () {
                                _self._renderFilesTab();
                                _self.currentEditor = _self.editors[_self.currentProject.currentFileId];
                            });
                        else//如果文件已经打开，只是没有被focs，那么focs这个文件
                            $filesTab.find('li[data-id=' + $this.attr('data-id') + ']').trigger('click');
                    } else {
                        _self.currentEditor.focus();
                    }
                }
            } else {
                $fileTree.find('li').removeClass('active').removeClass('rightMouse');
                $parent.addClass('active');
            }
            return false;
        });

        $directoryLi.find('span.arrow').bind('click', function () {
            var $this = $(this);

            $this.parent().toggleClass('open');

            _self._changeDirectoryStatus($this.nextAll('.path').val(), $this.parent().hasClass('open'));
        });
    },
    /**
     * 当文件夹展开时记录文件夹状态，重新渲染时自动展开文件夹
     * @param path
     * @private
     */
    _changeDirectoryStatus: function (path, isOpen) {
        var _self = this,
            split = Path.sep;
        if (Sys == 'Windows')
            split = '\\\\';
        var tmpArr = path.replace(_self.currentProject.path, '').split(split);
        tmpArr.shift();
        if (tmpArr.length > 0) {
            eval('(_self.currentProject["files"]["' + tmpArr.join('"]["') + '"]["isOpen"]=' + isOpen + ')');
            _self._resetLocalStorage();
        }
    },
    /**
     * 已打开文件列表事件绑定
     * @private
     */
    _filesTabBindEvent: function () {
        $filesTab.find('span.close').bind('click', function () {
            var $parent = $(this).parent();
            delete E.currentProject.openFiles[$parent.attr('data-id')];
            $('#editArea-' + $parent.attr('data-id')).remove();
            if ($parent.attr('data-id') == E.currentProject.currentFileId) {
                if ($parent.prev().size() > 0) {
                    $parent.prev().click();
                } else if ($parent.next().size() > 0) {
                    $parent.next().click();
                } else {
                    E.currentProject.currentFileId = '';
                    E.currentEditor = '';
                }
            }
            $parent.remove();

            E._resetLocalStorage();
        });
        $filesTab.find('li').bind({
                'click': function () {
                    var $this = $(this);
                    E.currentProject.currentFileId = $this.attr('data-id');

                    if ($this.hasClass('active'))return;


                    $filesTab.find('li').removeClass('active');
                    $this.addClass('active');

                    $main.find('.editArea').hide();
                    $('#editArea-' + E.currentProject.currentFileId).show();

                    E.currentEditor = E.editors[E.currentProject.currentFileId];
                },
                'dblclick': function () {
                    $('#menu-project').click();
                }
            }

        );

    },
    /**
     * 初始化文件树渲染
     * @private
     */
    _initTreeRender: function () {
        if (!E.Rabbit.projects.currentProjectName)
            return;
        else {
            var projects = E.Rabbit.projects;
            if (projects.currentProjectName)
                this._renderTree(projects[projects.currentProjectName]);
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
            E._openFile(item.id, item.path, function (editor) {
                var cursorData = files[key].cursorStatus;
                if (cursorData)
                    editor.gotoLine(cursorData.row, cursorData.column, item.id == E.currentProject.currentFileId);
            }, true);
            if (item.id != E.currentProject.currentFileId)
                $('#editArea-' + item.id).hide();
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
    _openDirectory: function (path) {
        E.currentProjectName = Path.basename(path);
        var currentProject = {
            path: path,
            isOpen: true,
            name: E.currentProjectName,
            files: {

            }
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
                    eval('(' + tmpStr + '={"_Typhone_directory_path":"' + item + '","isOpen" : false})');
                    eachDirectory(item);
                } else {
                    eval('if(!' + tmpStr + '["files"])' + tmpStr + '["files"]=[]');
                    eval('(' + tmpStr + '["files"].push({path:"' + item + '",isOpen : false, id : "f' + Math.floor(Math.random() * 100 + 1) + '"}))');
                }
            });
        }

        E.currentProject = $.extend(E.currentProject, currentProject);
        E._resetLocalStorage();
        this._renderTree(currentProject);

    },
    /**
     * 项目文件树渲染
     * @param data
     * @private
     */
    _renderTree: function (data) {
        var tmpTree = ['<ul><li  class="directory open"><span class="arrow"></span>' + new EJS({url: 'template/treeNode.ejs'}).render({data: {
            name: data.name,
            isProjectTitle: true,
            path: data.path
        }}) + '<ul>'];
        eachRender(data.files);
        function eachRender(tmpData) {
            for (var key in tmpData) {
                if (key == '_Typhone_directory_path' || key == 'isOpen')
                    continue;
                if (!(tmpData[key] instanceof Array)) {
                    //如果是文件夹对象
                    tmpTree.push('<li class="directory ' + (tmpData[key]['isOpen'] ? "open" : "") + '"><span class="arrow"></span>' + new EJS({url: 'template/treeNode.ejs'}).render({data: {
                        name: key,
                        path: tmpData[key]['_Typhone_directory_path']
                    }}));
                    tmpTree.push('<ul>');
                    eachRender(tmpData[key]);
                    tmpTree.push('</ul></li>');
                } else {
                    //如果是文件数组，则迭代渲染
                    tmpData[key].forEach(function (item) {
                        tmpTree.push('<li>' + new EJS({url: 'template/treeNode.ejs'}).render({data: {
                            name: Path.basename(item.path),
                            type: Path.extname(item.path).replace('.', ''),
                            path: item.path,
                            isFile: true,
                            id: item.id
                        }}) + '</li>');
                    });
                }
            }
        }

        tmpTree.push('</li></ul>');
        $fileTree.html(tmpTree.join(' '));

        E._treeBindEvent();
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
        E.Rabbit.projects[E.currentProjectName] = E.currentProject;

        localStorage.Rabbit = JSON.stringify(E.Rabbit);
    },
    _recordDirectoryStatus: function () {

    },
    /**
     * 打开文件
     * @param path
     * @private
     */
    _openFile: function (id, path, callback, isReopen) {
        var MIME = JSON.parse(fs.readFileSync(Path.join(global.dirname, 'c', 'MIME.json'), 'utf8'));
        fs.readFile(path, {
            encoding: 'utf8'
        }, function (err, data) {
            if (err) {
                errHandle['openFileErr']('');
                return;
            }
            if (!E.currentProject.openFiles) {
                E.currentProject.openFiles = {};
            }
            //E.currentProject.openFiles是已打开文件的tabs对象
            E.currentProject.currentFileId = id;

            if (!isReopen) {
                E.currentProject.openFiles[id] = {
                    name: Path.basename(path),
                    path: path,
                    id: id
                };
            }

            E.currentEditor = new Ace({
                id: id,
                content: data,
                mode: MIME[(Path.extname(path) || '.txt')],
                changeCallback: E._saveFile,
                focusCallback: E._editorFocusCallback,
                cursorChangeCallback: E._editorCursorChangeCallback
            }).editor;

            //保存起来供以后使用
            if (!E.editors) E.editors = {};
            E.editors[id] = E.currentEditor;

            E._resetLocalStorage();

            callback && callback(E.currentEditor);
        });

    },
    /**
     * 当编辑器获得焦点时
     * @private
     */
    _editorFocusCallback: function () {
        $fileTree.find('li.active').removeClass('active').addClass('rightMouse');
    },
    /**
     * 当编辑器鼠标位置变幻时
     * @private
     */
    _editorCursorChangeCallback: function (data) {
        E.currentProject.openFiles[E.currentProject.currentFileId].cursorStatus = {row: data.row, column: data.column};
        $('#cursorStatus').html(data.row + ':' + data.column);
        E._resetLocalStorage();
    },
    _saveFile: function () {
        fs.writeFileSync(E.currentProject.openFiles[E.currentProject.currentFileId].path, E.currentEditor.getValue(), "utf8");
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
    }



};
E.init();