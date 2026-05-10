document.addEventListener('DOMContentLoaded', () => {
    const topics = {
        '断裂带': {
            reason: '断裂带是板块运动的弱面，地壳岩石沿断裂面发生错动，产生地震并形成错动纵裂、断层裂缝等地貌。',
            examples: ['东非大裂谷带', '唐山断裂带', '海原古柳沟断裂带']
        },
        '断层地貌': {
            reason: '断层地貌由断层错动造成，常表现为断层崖、阶地、断层沟和错动地形。',
            examples: ['汶川映秀断层', '华山断层崖', '北川断层地貌']
        },
        '峡谷': {
            reason: '地震改变地形与河流坡度，河流沿弱面切割地层，形成深切峡谷。',
            examples: ['大渡河峡谷', '突尼斯峡谷', '青藏高原峡谷']
        },
        '大裂谷': {
            reason: '大裂谷通常由大陆张裂或广域断裂活动造成，地壳拉伸出现巨大的裂谷、断崖和坳陷。',
            examples: ['东非大裂谷', '京津冀大裂谷', '云南大裂谷']
        },
        '瀑布景观': {
            reason: '地震引发河道断裂错动或堰塞湖堵塞河流，形成落差显著的水流瀑布。',
            examples: ['九寨沟瀑布', '堰塞湖瀑布', '黄河断层瀑布']
        },
        '湖泊景观': {
            reason: '地震可形成堰塞湖、断裂湖和裂谷湖。',
            examples: ['小南海堰塞湖', '党家岔堰塞湖', '奥卡万戈三角洲湖泊']
        },
        '砂土液化遗迹景观': {
            reason: '液化发生在松散、饱和的砂土中，强震使孔隙水压力增大，形成喷砂口、沙火山等。',
            examples: ['唐山液化区', '基督城喷砂口', '汶川沙火山']
        },
        '河流三角洲': {
            reason: '地震改变河道和沉积条件，形成或改变三角洲。',
            examples: ['奥卡万戈三角洲', '黄河三角洲', '湄公河三角洲']
        },
        '独特的地貌': {
            reason: '特殊断裂、崩塌和溶蚀与地震耦合后，形成独特地貌。',
            examples: ['海原古柳撕裂', '华山双乳峰断崖', '九寨沟地震地貌']
        }
    };

    const cards = document.querySelectorAll('.collab-heritage .topic-card');
    const modal = document.getElementById('topicModal');
    const titleEl = document.getElementById('topic-modalTitle');
    const reasonEl = document.getElementById('topic-modalReason');
    const examplesEl = document.getElementById('topic-modalExamples');
    const closeBtn = document.getElementById('topic-modalClose');
    const modalContent = modal.querySelector('.modal-content');
    const showOverlayBtn = document.getElementById('topic-showOverlayBtn');
    const imageOverlay = document.getElementById('topic-imageOverlay');
    const overlayClose = document.getElementById('topic-overlayClose');
    const overlayPlaceholder = document.getElementById('topic-overlayPlaceholder');

    cards.forEach(card => {
        card.addEventListener('click', () => {
            openTopic(card.dataset.topic);
        });
    });

    closeBtn.addEventListener('click', closeModal);
    showOverlayBtn.addEventListener('click', () => {
        imageOverlay.classList.add('visible');
    });
    overlayClose.addEventListener('click', () => {
        imageOverlay.classList.remove('visible');
    });
    modal.addEventListener('click', event => {
        if (event.target === modal) {
            closeModal();
        }
    });

    function openTopic(topic) {
        const data = topics[topic];
        if (!data) return;
        titleEl.textContent = topic;
        reasonEl.textContent = data.reason;
        examplesEl.innerHTML = data.examples.map(item => `<li>${item}</li>`).join('');
        if (topic === '大裂谷') {
            modalContent.classList.add('topic-background');
            overlayPlaceholder.innerHTML = '<img src="images/东非大裂谷.png" alt="东非大裂谷" style="width:100%;height:100%;object-fit:cover;border-radius:8px;">';
        } else {
            modalContent.classList.remove('topic-background');
            overlayPlaceholder.textContent = '此处预留图片位置，可后续添加地貌示意图';
        }
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        modalContent.classList.remove('topic-background');
        imageOverlay.classList.remove('visible');
    }
});
