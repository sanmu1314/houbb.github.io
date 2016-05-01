/**
 * !
 * Created by houbb, All rights reserved.
 * @type {Base|*|{}}
 */

$(document).ready(function() {
    Base.initContentHeight();
    if(!Util.isMobile()) {  //use scroll bar when is PC;
        //Base.initBodyScrollBar();
    }

    //demo
    Base.select2Demo();
    Base.colResizable();

    //2048
    $('#2048').my2048();

    //UML
    $(".UML, .uml, #UML, #uml").sequenceDiagram({theme: 'hand'});
});

var Base = new Base();
function Base(){
    /**
     * init the content height
     */
    this.initContentHeight = function() {
        var content = $('.page-content');
        var headHeight = $('.site-header').height();
        var wh = Util.windowHeight();
        content.css('min-height', wh-headHeight);
    };
    /**
     * init body scroll bar
     */
    this.initBodyScrollBar = function() {
        $("body").mCustomScrollbar({
            //autoHideScrollbar:true,
            theme:"light-thick"
        });
        $("#back-to-top").on('click', function() {
            Base.autoScrollOff();
            $("body").mCustomScrollbar("scrollTo", "top");
        });
        $('#auto-read-leaf').on('click', function() {
            Base.autoReadLeaf();
        });
    };
    /**
     * auto read;
     */
    var content=$("body"),autoScrollTimerAdjust,autoScroll;
    this.autoReadLeaf = function() {
        var speed = 20000;
        var autoScrollTimer = (Util.windowHeight() / $('#mCSB_1_dragger_vertical').height()) * speed;
        content.mCustomScrollbar({
            scrollButtons:{enable:true},
            callbacks:{
                whileScrolling:function(){
                    autoScrollTimerAdjust=autoScrollTimer*this.mcs.topPct/100;
                },
                onScroll:function(){
                    if($(this).data("mCS").trigger==="internal"){Base.autoScrollOff()}
                }
            }
        });
        content.addClass("auto-scrolling-on auto-scrolling-to-bottom");
        this.autoScrollOn("bottom",autoScrollTimer);
    };
    /**
     *
     * @param to
     * @param timer
     */
    this.autoScrollOn = function(to,timer) {
        content.addClass("auto-scrolling-on").mCustomScrollbar("scrollTo",to,{scrollInertia:timer,scrollEasing:"easeInOutSmooth"});
    };
    this.autoScrollOff = function() {
        clearTimeout(autoScroll);
        content.removeClass("auto-scrolling-on").mCustomScrollbar("stop");
    };



    /**
     * select2 init
     */
    this.select2Demo = function() {
        $("select#index").select2();
        $("select#multi-index").select2();
        $("select#multi-index1").select2({});
        $("select#multi-index1").val(["home", "about"]).trigger("change");
    };
    /**
     * colResizable init
     */
    this.colResizable = function() {
        $('#colResizable').colResizable({
            liveDrag:true,
            gripInnerHtml:"<div class='grip'></div>",
            draggingClass:"dragging",
            minWidth: 100
        });
    };
};