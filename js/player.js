(function($){
	// Settings
	var isShowNotification = false,
		isInitMarquee = true,
		shuffleArray = [],
		shuffleIndex,
		autoClearTimer,
		autoShowTimer,
		isFirstPlay = localStorage.qplayer == undefined? true: false,
		isShuffle = localStorage.qplayer == undefined? false: localStorage.qplayer === 'true'? true: false;

	// Load playlist
	for (var i = 0; i < playlist.length; i++){
		var item = playlist[i];
		$('#playlist').append('<li class="lib" style="overflow:hidden;"><strong style="margin-left: 5px;">'+item.title+'</strong><span style="float: right;" class="artist">'+item.artist+'</span></li>');
		if (item.mp3 == "") {
			$('#playlist li').eq(i).css('color', '#ddd');
		}
	}

	var currentTrack = 0, audio, timeout;
	var shuffle_array = localStorage.qplayer_shuffle_array;

	if (isShuffle && shuffle_array != undefined && playlist.length === (shuffleArray=JSON.parse(shuffle_array)).length) {
		currentTrack = shuffleArray[0];
		shuffleIndex = 0;
	    $('#QPlayer .cover').attr('title', '鐐瑰嚮鍏抽棴闅忔満鎾斁');
	} else {
		isShuffle = false;
	    $('#QPlayer .cover').attr('title', '鐐瑰嚮寮€鍚殢鏈烘挱鏀�');
	}

	//鍒ゆ柇鏄惁鏄剧ず婊氬姩鏉�
	var totalHeight = 0;
	for (var i = 0; i < playlist.length; i++){
		totalHeight += ($('#playlist li').eq(i).height() + 6);
	}
	if (totalHeight > 360) {
		$('#playlist').css("overflow", "auto");
		if (isShuffle) {
			var temp = 0;
			for (var j = 0; j < currentTrack; j++) {
				temp += ($('#playlist li').eq(j).height() + 6);
			}
			$('#playlist').scrollTop(temp);
		}
	} 

	var play = function(){
		audio.play();
		if (isRotate) {
			$("#player .cover img").css("animation","9.8s linear 0s normal none infinite rotate");
		    $("#player .cover img").css("animation-play-state","running");
	    }
		$('.playback').addClass('playing');
		timeout = setInterval(updateProgress, 500);
		//瓒呰繃鏄剧ず鏍忚繍琛岃窇椹伅
		if(isExceedTag()) {
			if (isInitMarquee) {
				initMarquee();
				isInitMarquee = false;
			} else {
				$('.marquee').marquee('resume');
		    }
	    }
	}

	var pause = function(){
		audio.pause();
		$("#player .cover img").css("animation-play-state","paused");
		$('.playback').removeClass('playing');
		clearInterval(timeout);
		if(isExceedTag()) {
			$('.marquee').marquee('pause');
		}
	}

	// Update progress
	var setProgress = function(value){
		var currentSec = parseInt(value%60) < 10 ? '0' + parseInt(value%60) : parseInt(value%60),
			ratio = value / audio.duration * 100;

		$('.timer').html(parseInt(value/60)+':'+currentSec);
	}

	var updateProgress = function(){
		setProgress(audio.currentTime);
	}

	// Switch track
	var switchTrack = function(i){
		if (i < 0){
			track = currentTrack = playlist.length - 1;
		} else if (i >= playlist.length){
			track = currentTrack = 0;
		} else {
			track = i;
		}

		isInitMarquee = true;
		$('audio').remove();
		loadMusic(track);
		play();
	}

	// Shuffle
	var shufflePlay = function(i){
		if (i === 1) {
		//涓嬩竴棣�
		    if (++shuffleIndex === shuffleArray.length) {
		    	shuffleIndex = 0;
		    }
		    currentTrack = shuffleArray[shuffleIndex];

		} else if (i === 0) {
		//涓婁竴棣�
		    if (--shuffleIndex < 0) {
		    	shuffleIndex = shuffleArray.length - 1;
		    }
		    currentTrack = shuffleArray[shuffleIndex];
		}
		switchTrack(currentTrack);
	}

	// Fire when track ended
	var ended = function(){
		pause();
		audio.currentTime = 0;
		if (isShuffle){
			shufflePlay(1);
		} else { 
			if (currentTrack < playlist.length) switchTrack(++currentTrack);
		}
		
	}

	var beforeLoad = function(){
		var endVal = this.seekable && this.seekable.length ? this.seekable.end(0) : 0;
	}

	// Fire when track loaded completely
	var afterLoad = function(){
		if (autoplay == true) play();
	}

	// Load track
	var loadMusic = function(i){
		var item = playlist[i];
		while (item.mp3 == "") {
	        showNotification('姝屾洸鍦板潃涓虹┖锛屽凡鑷姩璺宠繃');
			if (isShuffle) {
				if (++shuffleIndex === shuffleArray.length) {
			    	shuffleIndex = 0;
			    }
			    i = currentTrack = shuffleArray[shuffleIndex];
			} else {
				currentTrack = ++i;
			}
			item = playlist[i];
		}
		var newaudio = $('<audio>').html('<source src="'+item.mp3+'"><source src="'+item.ogg+'">').appendTo('#player');
		$('.cover').html('<img src="'+item.cover+'" alt="'+item.album+'">');
		$('.musicTag').html('<strong>'+item.title+'</strong><span> - </span><span class="artist">'+item.artist+'</span>');
		$('#playlist li').removeClass('playing').eq(i).addClass('playing');
		audio = newaudio[0];
		audio.addEventListener('progress', beforeLoad, false);
		audio.addEventListener('durationchange', beforeLoad, false);
		audio.addEventListener('canplay', afterLoad, false);
		audio.addEventListener('ended', ended, false);
	}

	loadMusic(currentTrack);

	$('.playback').on('click', function(){
		if ($(this).hasClass('playing')){
			pause();
		} else {
			play();
		}
	});

	$('.rewind').on('click', function(){
		if (isShuffle){
			shufflePlay(0);
		} else {
			switchTrack(--currentTrack);
		}
	});

	$('.fastforward').on('click', function(){
		if (isShuffle){
			shufflePlay(1);
		} else {
			switchTrack(++currentTrack);
		}
	});
	
	$('#playlist li').each(function(i){
		$(this).on('click', function(){
			if (isShuffle) {
				for (var j = 0; j < shuffleArray.length; j++) {
					if (shuffleArray[j] === i) {
						shuffleIndex = j;
						break;
					}
				}
			} else {
			    currentTrack = i;
			}
			switchTrack(i);
		});
	});

	$('#QPlayer .liebiao,#QPlayer .liebiao').on('click', function(){
		var pl = $('#playlist');
		if (pl.hasClass('go') === false) {
			pl.css({"max-height":"360px","transition":"max-height .5s ease"});		
			pl.css("border", "1px solid #dedede");
			pl.addClass('go');
		} else {
			pl.css({"max-height":"0px","transition":"max-height .5s ease"});
			pl.css("border", "0");
			pl.removeClass('go');
		}
	});		

	$("#QPlayer .ssBtn").on('click', function(){
		var mA = $("#QPlayer");
		if ($('.ssBtn .adf').hasClass('on') === false) {
			if (isFirstPlay) {
			    setTimeout("showTips('#player .cover','鐐瑰嚮灏侀潰寮€鍚�(鍏抽棴)闅忔満鎾斁', " + function(){setTimeout("showTips('#player .ctrl .musicTag','鐐瑰嚮鎷栧姩鏍囬鏍忓揩杩�(蹇€€)')", 1000)} + ");", 500);
			    isFirstPlay = !isFirstPlay;
			    localStorage.qplayer = 'false';
			}
			mA.css("transform", "translateX(250px)");
		    $('.ssBtn .adf').addClass('on');
		} else {	
			mA.css("transform", "translateX(0px)");
            $('.ssBtn .adf').removeClass('on') 	
		}
	}); 

	$("#player .cover").on('click',function(){
		isShuffle = !isShuffle;
		if (isShuffle) {
	        $("#player .cover").attr("title","鐐瑰嚮鍏抽棴闅忔満鎾斁");
	        showNotification('宸插紑鍚殢鏈烘挱鏀�');

			var temp = [];
			for (var i = 0; i < playlist.length; i++) {
				temp[i] = i;
			}
			shuffleArray = shuffle(temp);
			for (var j = 0; j < shuffleArray.length; j++) {
				if (shuffleArray[j] === currentTrack) {
					shuffleIndex = j;
					break;
				}
			}
			localStorage.qplayer_shuffle_array = JSON.stringify(shuffleArray);
		} else {
	        $("#player .cover").attr("title","鐐瑰嚮寮€鍚殢鏈烘挱鏀�");
	        showNotification('宸插叧闂殢鏈烘挱鏀�');
	        localStorage.removeItem('qplayer_shuffle_array');
		}
		localStorage.qplayer = isShuffle;
	});


    var startX, endX;
    $('#player .ctrl .musicTag').mousedown(function(event){
    	startX = event.screenX;
    }).mousemove(function(event){
    	//榧犳爣宸﹂敭
    	if (event.which === 1) {
	    	endX = event.screenX;
	    	var seekRange = Math.round((endX - startX) / 678 * 100);
	    	audio.currentTime += seekRange;
	    	setProgress(audio.currentTime);
	    }
    });

    $('#player .ctrl .musicTag').bind('touchstart', function(event){
    	startX = event.originalEvent.targetTouches[0].screenX;
    }).bind('touchmove',function(event){
    	endX = event.originalEvent.targetTouches[0].screenX;
    	var seekRange = Math.round((endX - startX) / 678 * 100);
    	audio.currentTime += seekRange;
    	setProgress(audio.currentTime);
    });

})(jQuery);


function initMarquee(){
	$('.marquee').marquee({
	    //speed in milliseconds of the marquee
	    duration: 15000,
	    //gap in pixels between the tickers
	    gap: 50,
	    //time in milliseconds before the marquee will start animating
	    delayBeforeStart: 0,
	    //'left' or 'right'
	    direction: 'left',
	    //true or false - should the marquee be duplicated to show an effect of continues flow
	    duplicated: true
	});
}

//妫€娴嬫爣棰樺拰浣滆€呬俊鎭€诲搴︽槸鍚﹁秴鍑烘挱鏀惧櫒锛岃秴杩囧垯杩斿洖true寮€鍚窇椹伅
function isExceedTag() {
	var isExceedTag = false;
	if ($('.musicTag strong').width() + $('.musicTag span').width() + $('.musicTag .artist').width() > $('.musicTag').width()) {
	    isExceedTag = true;
	}
	return isExceedTag;
}


function shuffle(array) {
    var m = array.length,
        t, i;
    // 濡傛灉杩樺墿鏈夊厓绱犫€�
    while (m) {
        // 闅忔満閫夊彇涓€涓厓绱犫€�
        i = Math.floor(Math.random() * m--);
        // 涓庡綋鍓嶅厓绱犺繘琛屼氦鎹�
        t = array[m];
        array[m] = array[i];
        array[i] = t;
    }
    return array;
}

function showNotification(info) {
	isShowNotification = true;
	//鍒ゆ柇閫氱煡鏄惁瀛樺湪锛屽瓨鍦ㄥ氨绉婚櫎
    if ($('.qplayer-notification').length>0) {
    	$('.qplayer-notification').remove();
    	clearTimeout(autoClearTimer);
    	clearTimeout(autoShowTimer);
    }
	$('body').append('<div class="qplayer-notification animation-target"><span class="qplayer-notification-icon">i</span><span class="body" style="box-shadow: rgba(0, 0, 0, 0.0980392) 0px 0px 5px;"><span class="message"></span></span><a class="close" href="#" onclick="closeNotification();return false;">脳</a><div style="clear: both"></div>');
	$('.qplayer-notification .message').text(info);
	//鐢╳idth:auto鏉ヨ嚜鍔ㄨ幏鍙栭€氱煡鏍忓搴�
	var width = $('.qplayer-notification').css({"opacity":"0", "width":"auto"}).width() + 20;
	$('.qplayer-notification').css({"width":"50px","opacity":"1"});
	
	autoShowTimer = setTimeout(function(){
		$('.qplayer-notification').css({"width":width,"transition":"all .7s ease"});
		$('.qplayer-notification .close').delay(500).show(0);
	},1500);
	autoClearTimer = setTimeout("if ($('.qplayer-notification').length>0) {closeNotification()}",8000);
}


function closeNotification() {
	isShowNotification = false;
	$('.qplayer-notification').css({"width":"50px","transition":"all .7s ease"});
	$('.qplayer-notification .close').delay(500).hide(0);
	setTimeout(function(){
		if (!isShowNotification) {
			$('.qplayer-notification').css("opacity","0");
			$('.qplayer-notification-icon').css({"transform":"scale(0)","transition":"transform .5s ease"});
	    }
	},1000);
	setTimeout(function(){
		if (!isShowNotification) {
			$('.qplayer-notification').remove();
		}
	},1500);
    clearTimeout(autoClearTimer);
    clearTimeout(autoShowTimer);
}

/*
*div: 瑕佸湪鍏朵笂闈㈡樉绀簍ip鐨刣iv
*info: tip鍐呭
*func: 涓嶅啀鎻愮ず鎸夐挳鐨刢lick缁戝畾鍑芥暟
*/
function showTips(div, info, func) {
	var box_height = 100;
	$('body').append('<div class="qplayer_tips"><span class="tips_arrow"></span><span class="info" style="display:none">' + info + '</span><button class="tips_button" onclick="removeTips()">涓嶅啀鎻愮ず</button></div>');
	$('.qplayer_tips').css({"top":$(div).offset().top-box_height-30-15, "left": $(div).offset().left-28});
	$('.qplayer_tips').css({"height":box_height,"transition":"all .5s ease-in-out"});
	$('.qplayer_tips .info').delay(500).fadeIn();
	$('.tips_arrow').css({"border-width":"15px","transition":"all .5s ease-in-out"});
	$('.tips_button').css({"height":"30px","transition":"all .5s ease-in-out"});
	if (func != undefined) {
		$('.tips_button').click(func);
	}
}

function removeTips() {
	$('.qplayer_tips .info').fadeOut();
	$('.qplayer_tips').css({"height":"0","transition":"all .5s ease-in-out"});
	$('.tips_arrow').css({"border-width":"0","transition":"all .5s ease-in-out"});
	$('.tips_button').css({"opacity":"0","transition":"all .2s ease-in-out"});
	setTimeout(function(){$('.qplayer_tips').remove()}, 500);
}
