document.addEventListener('DOMContentLoaded', () => {
    const heritageItems = [
        {
            name: '大裂谷',
            shortDesc: '地壳张裂形成的大尺度线性地貌带。',
            longDesc: '大裂谷多由拉张构造与深大断裂共同控制，常呈带状凹陷与阶梯状地形。它记录了地壳伸展与岩石圈演化过程，是研究区域构造活动的重要窗口。',
            images: [
                'images/大裂谷/东非大裂谷.png',
                'images/大裂谷/云南大裂谷.jpg',
                'images/断裂带/东非大裂谷.png'
            ]
        },
        {
            name: '河流三角洲',
            shortDesc: '地震扰动影响下的河口沉积与河道重组地貌。',
            longDesc: '强震可能引发地面沉降、河道改道和泥沙输运变化，导致三角洲前缘推进或局部后退。该类景观反映了构造活动与沉积过程的耦合效应。',
            images: [
                'images/河流三角洲/奥卡万戈三角洲湖泊.jpg',
                'images/河流三角洲/奥卡万戈三角洲湖泊 (1).jpg',
                'images/河流三角洲/奥卡万戈三角洲湖泊.jpg'
            ]
        },
        {
            name: '瀑布景观',
            shortDesc: '断层抬升与河道突变形成的瀑布系统。',
            longDesc: '地震可通过断层差异升降与坡折形成瀑布景观，也可通过阻塞和再下切塑造多级跌水地形。瀑布是地貌快速响应地震事件的直观证据。',
            images: [
                'images/瀑布景观/九寨沟.jpg',
                'images/瀑布景观/黄河断层瀑布—壶口瀑布.jpg',
                'images/瀑布景观/汶川地震堰塞湖.jpg'
            ]
        },
        {
            name: '砂土液化遗迹景观',
            shortDesc: '地震振动使饱和砂层失稳并喷砂冒水。',
            longDesc: '液化常发生于浅层饱和砂土，表现为喷砂口、砂脊与地表鼓胀。其空间分布可用于反演震动强度与场地条件，对震害评估和工程选址意义重大。',
            images: [
                'images/砂土液化遗迹景观/地震后的沙火山.jpg',
                'images/砂土液化遗迹景观/地震后的沙火山 (1).jpg',
                'images/砂土液化遗迹景观/地震后的沙火山.jpg'
            ]
        },
        {
            name: '山体崩塌遗迹',
            shortDesc: '强震触发边坡失稳形成崩塌堆积体。',
            longDesc: '地震动会显著降低岩土体稳定性，导致山体崩塌、落石与滑坡链式灾害。崩塌遗迹可反映震源机制、坡体结构与地震烈度分布。',
            images: [
                'images/峡谷/大渡河峡谷.jpg',
                'images/峡谷/青藏高原峡谷.jpg',
                'images/峡谷/突尼斯峡谷.jpg'
            ]
        },
        {
            name: '地震堰塞湖',
            shortDesc: '滑坡堵江后形成的震后湖泊景观。',
            longDesc: '地震诱发的大规模滑坡可瞬时阻断河流，形成堰塞湖。其演化涉及漫顶、渗流和溃决风险，是震后应急与长期治理的关键对象。',
            images: [
                'images/湖泊景观/小南海堰塞湖.jpg',
                'images/湖泊景观/党家岔堰塞湖.jpg',
                'images/瀑布景观/汶川地震堰塞湖.jpg'
            ]
        },
        {
            name: '地裂缝遗迹',
            shortDesc: '地表拉张或剪切形成的线性裂缝系统。',
            longDesc: '地裂缝通常与断层活动、场地不均匀变形及液化相关。其几何形态和展布方向可用于识别主控构造并辅助震后地质灾害分区。',
            images: [
                'images/断层地貌/汶川映秀断层.jpg',
                'images/断层地貌/华山断层崖.jpg',
                'images/断裂带/郯庐断裂带.jpg'
            ]
        },
        {
            name: '古地震遗址',
            shortDesc: '保留古地震活动证据的地貌与地层剖面。',
            longDesc: '古地震遗址包含断错地层、液化沉积和变形构造等信息，可用于重建历史地震序列与复发周期，是地震危险性分析的重要基础。',
            images: [
                'images/独特的地貌/海原古柳撕裂.png',
                'images/独特的地貌/九寨沟地震前后.jpg',
                'images/独特的地貌/双乳峰.jpg'
            ]
        },
        {
            name: '地震断层崖',
            shortDesc: '断层快速错动在地表形成陡坎地貌。',
            longDesc: '断层崖通常由同震位移直接形成，具有明显高差和线性展布特征。它是识别活动断层、估算同震位移及评估地震潜势的核心地貌标志。',
            images: [
                'images/断层地貌/华山断层崖.jpg',
                'images/断层地貌/汶川映秀断层.jpg',
                'images/断裂带/郯庐断裂带.jpg'
            ]
        }
    ];

    const grid = document.getElementById('heritageCardGrid');
    const modal = document.getElementById('heritageFullscreenModal');
    const closeBtn = document.getElementById('heritageModalCloseBtn');
    const prevBtn = document.getElementById('heritagePrevBtn');
    const nextBtn = document.getElementById('heritageNextBtn');
    const modalImage = document.getElementById('heritageModalImage');
    const modalTitle = document.getElementById('heritageModalTitle');
    const modalShort = document.getElementById('heritageModalShort');
    const modalDesc = document.getElementById('heritageModalDesc');
    const dotsWrap = document.getElementById('heritageDots');

    if (!grid || !modal || !closeBtn || !prevBtn || !nextBtn || !modalImage || !modalTitle || !modalShort || !modalDesc || !dotsWrap) {
        return;
    }

    let currentItemIndex = 0;
    let currentImageIndex = 0;

    renderCards();
    bindModalEvents();

    function renderCards() {
        const cardHtml = heritageItems.map((item, idx) => {
            return `
                <article class="heritage-card" data-item-index="${idx}" tabindex="0" role="button" aria-label="查看${item.name}">
                    <img class="heritage-card-image" src="${item.images[0]}" alt="${item.name}">
                    <h3>${item.name}</h3>
                    <p>${item.shortDesc}</p>
                </article>
            `;
        }).join('');

        grid.innerHTML = cardHtml;

        grid.querySelectorAll('.heritage-card').forEach((card) => {
            card.addEventListener('click', () => {
                const idx = Number(card.dataset.itemIndex);
                openModal(idx, 0);
            });

            card.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    const idx = Number(card.dataset.itemIndex);
                    openModal(idx, 0);
                }
            });
        });
    }

    function bindModalEvents() {
        closeBtn.addEventListener('click', closeModal);
        prevBtn.addEventListener('click', () => switchImage(-1));
        nextBtn.addEventListener('click', () => switchImage(1));

        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (!modal.classList.contains('show')) return;

            if (event.key === 'Escape') {
                closeModal();
            } else if (event.key === 'ArrowLeft') {
                switchImage(-1);
            } else if (event.key === 'ArrowRight') {
                switchImage(1);
            }
        });
    }

    function openModal(itemIndex, imageIndex) {
        currentItemIndex = itemIndex;
        currentImageIndex = imageIndex;
        renderModal();
        modal.classList.add('show');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.classList.remove('show');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    function switchImage(offset) {
        const images = heritageItems[currentItemIndex].images;
        currentImageIndex = (currentImageIndex + offset + images.length) % images.length;
        renderModal();
    }

    function renderModal() {
        const item = heritageItems[currentItemIndex];
        const imgSrc = item.images[currentImageIndex];

        modalImage.src = imgSrc;
        modalImage.alt = item.name;
        modalTitle.textContent = item.name;
        modalShort.textContent = item.shortDesc;
        modalDesc.textContent = item.longDesc;

        renderDots(item.images.length);
    }

    function renderDots(total) {
        const dots = [];
        for (let i = 0; i < total; i += 1) {
            const active = i === currentImageIndex ? 'active' : '';
            dots.push(`<button type="button" class="heritage-dot ${active}" data-dot-index="${i}" aria-label="切换到第${i + 1}张"></button>`);
        }
        dotsWrap.innerHTML = dots.join('');

        dotsWrap.querySelectorAll('.heritage-dot').forEach((dot) => {
            dot.addEventListener('click', () => {
                currentImageIndex = Number(dot.dataset.dotIndex);
                renderModal();
            });
        });
    }
});
