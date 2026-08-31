const SUPABASE_URL =
    "https://wslzxmwtvgrlatxfldfo.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_mzXpQzrV5FWTFYzMAn9ZGw_Vf9rbD_q";


const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


let currentPage = null;

let scale = 1;

let translateX = 0;

let translateY = 0;

let startX = 0;

let startY = 0;

let dragging = false;

let initialDistance = 0;

let initialScale = 1;


/* =========================================
   INITIALIZE
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    initialize
);


async function initialize() {

    try {

        const params =
            new URLSearchParams(
                window.location.search
            );


        const slug =
            params.get("slug");


        /*
         No slug means homepage
        */

        if (!slug) {

            await loadHomepage();

            return;

        }


        /*
         Slug means individual voting page
        */

        await ensureAnonymousLogin();

        await loadVotingPage(slug);

    }

    catch (error) {

        console.error(error);

        showError(
            error.message ||
            "Something went wrong."
        );

    }

}


/* =========================================
   HOMEPAGE
========================================= */

async function loadHomepage() {

    document.title =
        "Voting Portal";


    document.getElementById(
        "homePage"
    ).classList.remove("hidden");


    document.getElementById(
        "votingPage"
    ).classList.add("hidden");


    const {
        data,
        error
    } =
        await supabaseClient
            .from("voting_pages")
            .select("*")
            .eq(
                "is_published",
                true
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    document.getElementById(
        "homeLoading"
    ).classList.add("hidden");


    if (error) {

        console.error(error);

        document.getElementById(
            "homeError"
        ).textContent =
            error.message;

        document.getElementById(
            "homeError"
        ).classList.remove(
            "hidden"
        );

        return;

    }


    if (!data || !data.length) {

        document.getElementById(
            "noPages"
        ).classList.remove(
            "hidden"
        );

        return;

    }


    renderVotingPages(data);

}


/* =========================================
   RENDER ALL VOTING PAGES
========================================= */

function renderVotingPages(pages) {

    const grid =
        document.getElementById(
            "pagesGrid"
        );


    grid.innerHTML = "";


    pages.forEach(
        function (page, index) {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "voting-page-card";


            card.style.animationDelay =
                `${index * 0.08}s`;


            const link =
                `index.html?slug=${encodeURIComponent(page.slug)}`;


            card.innerHTML = `

                <div class="card-images">

                    <div class="mini-image">

                        <img
                            src="${escapeHtml(page.image1_url)}"
                            alt="${escapeHtml(page.image1_name)}">

                    </div>

                    <div class="mini-image">

                        <img
                            src="${escapeHtml(page.image2_url)}"
                            alt="${escapeHtml(page.image2_name)}">

                    </div>

                </div>


                <div class="card-content">

                    <div class="card-number">
                        ${String(index + 1).padStart(2, "0")}
                    </div>

                    <h2>
                        ${escapeHtml(page.title)}
                    </h2>


                    <div class="card-options">

                        <span>
                            ${escapeHtml(page.image1_name)}
                        </span>

                        <span class="versus">
                            VS
                        </span>

                        <span>
                            ${escapeHtml(page.image2_name)}
                        </span>

                    </div>


                    <div class="card-actions">

    <a
        href="${link}"
        class="vote-now-button">

        <span>Vote Now</span>
        <span>→</span>

    </a>    

    <a
    href="results.html?slug=${encodeURIComponent(page.slug)}"
    class="results-link">
    Live Results
</a>
</div>
                </div>

            `;


            grid.appendChild(card);

        }
    );

}


/* =========================================
   ANONYMOUS LOGIN
========================================= */

async function ensureAnonymousLogin() {

    const {
        data: sessionData
    } =
        await supabaseClient.auth.getSession();


    if (sessionData.session) {

        return;

    }


    const {
        error
    } =
        await supabaseClient.auth
            .signInAnonymously();


    if (error) {

        throw error;

    }

}


/* =========================================
   LOAD VOTING PAGE
========================================= */

async function loadVotingPage(slug) {

    document.getElementById(
        "homePage"
    ).classList.add("hidden");


    document.getElementById(
        "votingPage"
    ).classList.remove("hidden");


    const {
        data,
        error
    } =
        await supabaseClient
            .from("voting_pages")
            .select("*")
            .eq(
                "slug",
                slug
            )
            .eq(
                "is_published",
                true
            )
            .single();


    if (error) {

        throw new Error(
            "Voting page not found."
        );

    }


    currentPage = data;


    document.title =
        data.title;


    document.getElementById(
        "pageTitle"
    ).textContent =
        data.title;


    document.getElementById(
        "image1Name"
    ).textContent =
        data.image1_name;


    document.getElementById(
        "image2Name"
    ).textContent =
        data.image2_name;


    document.getElementById(
        "image1"
    ).src =
        data.image1_url;


    document.getElementById(
        "image2"
    ).src =
        data.image2_url;


    document.getElementById(
        "loading"
    ).classList.add("hidden");


    document.getElementById(
        "votingContent"
    ).classList.remove(
        "hidden"
    );


    await checkExistingVote();

}


/* =========================================
   GO HOME
========================================= */

function goHome() {

    window.location.href =
        "index.html";

}


/* =========================================
   CHECK EXISTING VOTE
========================================= */

async function checkExistingVote() {

    const {
        data: {
            user
        }
    } =
        await supabaseClient.auth
            .getUser();


    if (!user) {

        return;

    }


    const {
        data
    } =
        await supabaseClient
            .from("votes")
            .select("id")
            .eq(
                "page_id",
                currentPage.id
            )
            .eq(
                "user_id",
                user.id
            )
            .maybeSingle();


    if (data) {

        disableVotingForm();


        showVoteMessage(
            "You have already voted on this page.",
            "success"
        );

    }

}


/* =========================================
   VOTING FORM
========================================= */

document.getElementById(
    "voteForm"
).addEventListener(
    "submit",
    submitVote
);


async function submitVote(event) {

    event.preventDefault();


    const voterName =
        document.getElementById(
            "voterName"
        ).value.trim();


    const comment =
        document.getElementById(
            "comment"
        ).value.trim();


    const selectedVote =
        document.querySelector(
            'input[name="vote"]:checked'
        );


    if (!voterName) {

        showVoteMessage(
            "Please enter your name.",
            "error"
        );

        return;

    }


    if (!selectedVote) {

        showVoteMessage(
            "Please select an image to vote for.",
            "error"
        );

        return;

    }


    const button =
        document.getElementById(
            "submitVote"
        );


    button.disabled = true;


    button.innerHTML =
        "<span>Submitting...</span><span>✦</span>";


    try {

        const {
            data: {
                user
            }
        } =
            await supabaseClient.auth
                .getUser();


        if (!user) {

            throw new Error(
                "Unable to identify your session."
            );

        }


        const {
            error
        } =
            await supabaseClient
                .from("votes")
                .insert({

                    page_id:
                        currentPage.id,

                    user_id:
                        user.id,

                    voter_name:
                        voterName,

                    vote:
                        Number(
                            selectedVote.value
                        ),

                    comment:
                        comment || null

                });


        if (error) {

            if (
                error.code === "23505"
            ) {

                disableVotingForm();


                showVoteMessage(
                    "You have already voted on this page.",
                    "error"
                );


                return;

            }


            throw error;

        }


        disableVotingForm();


        showVoteMessage(
            "Your vote has been submitted successfully. Thank you!",
            "success"
        );

    }

    catch (error) {

        console.error(error);


        button.disabled = false;


        button.innerHTML =
            "<span>Submit My Vote</span><span>→</span>";


        showVoteMessage(
            error.message ||
            "Unable to submit your vote.",
            "error"
        );

    }

}


/* =========================================
   DISABLE FORM
========================================= */

function disableVotingForm() {

    document.querySelectorAll(
        'input[name="vote"]'
    ).forEach(
        input =>
            input.disabled = true
    );


    document.getElementById(
        "voterName"
    ).disabled = true;


    document.getElementById(
        "comment"
    ).disabled = true;


    document.getElementById(
        "submitVote"
    ).disabled = true;

}


/* =========================================
   VOTE MESSAGE
========================================= */

function showVoteMessage(
    message,
    type
) {

    const element =
        document.getElementById(
            "voteMessage"
        );


    element.textContent =
        message;


    element.className =
        `message ${type}`;

}


/* =========================================
   ERROR
========================================= */

function showError(message) {

    const element =
        document.getElementById(
            "errorMessage"
        );


    if (element) {

        element.textContent =
            message;

        element.classList.remove(
            "hidden"
        );

    }

}


/* =========================================
   COMMENT CHARACTER COUNT
========================================= */

const commentBox =
    document.getElementById(
        "comment"
    );


if (commentBox) {

    commentBox.addEventListener(
        "input",
        function () {

            document.getElementById(
                "characterCount"
            ).textContent =
                this.value.length;

        }
    );

}


/* =========================================
   IMAGE VIEWER
========================================= */

function openImage(number) {

    const image =
        document.getElementById(
            `image${number}`
        );


    const fullImage =
        document.getElementById(
            "fullImage"
        );


    fullImage.src =
        image.src;


    document.getElementById(
        "imageModal"
    ).classList.remove(
        "hidden"
    );


    resetZoom();

}


function closeImage() {

    document.getElementById(
        "imageModal"
    ).classList.add(
        "hidden"
    );


    resetZoom();

}


function zoomIn() {

    scale =
        Math.min(
            6,
            scale + 0.25
        );


    updateImageTransform();

}


function zoomOut() {

    scale =
        Math.max(
            1,
            scale - 0.25
        );


    updateImageTransform();

}


function resetZoom() {

    scale = 1;

    translateX = 0;

    translateY = 0;


    updateImageTransform();

}


function updateImageTransform() {

    const image =
        document.getElementById(
            "fullImage"
        );


    image.style.transform =
        `translate(${translateX}px, ${translateY}px) scale(${scale})`;


    const zoomLevel =
        document.getElementById(
            "zoomLevel"
        );


    if (zoomLevel) {

        zoomLevel.textContent =
            `${Math.round(scale * 100)}%`;

    }

}


/* =========================================
   MOUSE WHEEL ZOOM
========================================= */

document.getElementById(
    "zoomContainer"
).addEventListener(
    "wheel",
    function (event) {

        event.preventDefault();


        if (event.deltaY < 0) {

            zoomIn();

        }

        else {

            zoomOut();

        }

    },
    {
        passive: false
    }
);


/* =========================================
   TOUCH ZOOM
========================================= */

const zoomContainer =
    document.getElementById(
        "zoomContainer"
    );


zoomContainer.addEventListener(
    "touchstart",
    function (event) {

        if (
            event.touches.length === 2
        ) {

            initialDistance =
                getDistance(
                    event.touches[0],
                    event.touches[1]
                );


            initialScale =
                scale;

        }

        else if (
            event.touches.length === 1
        ) {

            startX =
                event.touches[0].clientX
                - translateX;


            startY =
                event.touches[0].clientY
                - translateY;


            dragging = true;

        }

    },
    {
        passive: false
    }
);


zoomContainer.addEventListener(
    "touchmove",
    function (event) {

        event.preventDefault();


        if (
            event.touches.length === 2
        ) {

            const distance =
                getDistance(
                    event.touches[0],
                    event.touches[1]
                );


            scale =
                initialScale *
                (
                    distance /
                    initialDistance
                );


            scale =
                Math.max(
                    1,
                    Math.min(
                        6,
                        scale
                    )
                );


            updateImageTransform();

        }

        else if (
            event.touches.length === 1 &&
            dragging
        ) {

            translateX =
                event.touches[0].clientX
                - startX;


            translateY =
                event.touches[0].clientY
                - startY;


            updateImageTransform();

        }

    },
    {
        passive: false
    }
);


zoomContainer.addEventListener(
    "touchend",
    function () {

        dragging = false;

    }
);


function getDistance(
    touch1,
    touch2
) {

    return Math.sqrt(

        Math.pow(
            touch1.clientX -
            touch2.clientX,
            2
        )

        +

        Math.pow(
            touch1.clientY -
            touch2.clientY,
            2
        )

    );

}


/* =========================================
   KEYBOARD
========================================= */

document.addEventListener(
    "keydown",
    function (event) {

        if (
            event.key === "Escape"
        ) {

            closeImage();

        }

    }
);


/* =========================================
   HTML ESCAPING
========================================= */

function escapeHtml(value) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}










/* =========================================================
   LIQUID WATER BACKGROUND
========================================================= */

(function () {

    const canvas = document.createElement("canvas");

    canvas.id = "liquid-bg";

    document.body.prepend(canvas);

    const ctx = canvas.getContext("2d", {
        alpha: false
    });

    let width = 0;
    let height = 0;

    function resize() {

        const dpr = Math.min(
            window.devicePixelRatio || 1,
            1.5
        );

        width = window.innerWidth;
        height = window.innerHeight;

        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);

        canvas.style.width = width + "px";
        canvas.style.height = height + "px";

        ctx.setTransform(
            dpr,
            0,
            0,
            dpr,
            0,
            0
        );
    }

    resize();

    window.addEventListener(
        "resize",
        resize,
        {
            passive: true
        }
    );


    /* ================================================
       LIQUID RIBBONS
    ================================================ */

    const ribbons = [

        {
            y: 0.18,
            height: 0.30,
            speed: 0.75,
            phase: 0,
            color1: "#32147a",
            color2: "#641ee6"
        },

        {
            y: 0.43,
            height: 0.34,
            speed: 0.58,
            phase: 2,
            color1: "#4c16b8",
            color2: "#821ee8"
        },

        {
            y: 0.70,
            height: 0.30,
            speed: 0.68,
            phase: 4,
            color1: "#24116b",
            color2: "#5520c9"
        }

    ];


    function drawRibbon(ribbon, time) {

        const centerY =
            height * ribbon.y;

        const ribbonHeight =
            height * ribbon.height;


        const gradient =
            ctx.createLinearGradient(
                0,
                centerY - ribbonHeight,
                width,
                centerY + ribbonHeight
            );


        gradient.addColorStop(
            0,
            ribbon.color1
        );

        gradient.addColorStop(
            0.5,
            ribbon.color2
        );

        gradient.addColorStop(
            1,
            ribbon.color1
        );


        ctx.fillStyle = gradient;


        ctx.beginPath();


        const step = 12;


        for (
            let x = -30;
            x <= width + 30;
            x += step
        ) {

            const nx =
                x / width;


            const wave1 =
                Math.sin(
                    nx * 5.2 +
                    time * ribbon.speed +
                    ribbon.phase
                );


            const wave2 =
                Math.sin(
                    nx * 9.0 -
                    time * ribbon.speed * 0.65 +
                    ribbon.phase
                );


            const wave3 =
                Math.cos(
                    nx * 2.7 +
                    time * ribbon.speed * 0.35
                );


            const y =
                centerY +
                wave1 * height * 0.075 +
                wave2 * height * 0.035 +
                wave3 * height * 0.025;


            if (x === -30) {

                ctx.moveTo(
                    x,
                    y
                );

            } else {

                ctx.lineTo(
                    x,
                    y
                );

            }

        }


        for (
            let x = width + 30;
            x >= -30;
            x -= step
        ) {

            const nx =
                x / width;


            const wave1 =
                Math.sin(
                    nx * 5.2 +
                    time * ribbon.speed +
                    ribbon.phase
                );


            const wave2 =
                Math.sin(
                    nx * 9.0 -
                    time * ribbon.speed * 0.65 +
                    ribbon.phase
                );


            const wave3 =
                Math.cos(
                    nx * 2.7 +
                    time * ribbon.speed * 0.35
                );


            const y =
                centerY +
                wave1 * height * 0.075 +
                wave2 * height * 0.035 +
                wave3 * height * 0.025 +
                ribbonHeight;


            ctx.lineTo(
                x,
                y
            );

        }


        ctx.closePath();

        ctx.fill();
    }


    /* ================================================
       LARGE MOVING LIQUID MASSES
    ================================================ */

    function drawMass(
        x,
        y,
        radius,
        color,
        time,
        speed,
        phase
    ) {

        const moveX =
            Math.sin(
                time * speed +
                phase
            ) *
            width *
            0.12;


        const moveY =
            Math.cos(
                time * speed * 0.72 +
                phase
            ) *
            height *
            0.055;


        const cx =
            x * width +
            moveX;


        const cy =
            y * height +
            moveY;


        const gradient =
            ctx.createRadialGradient(
                cx,
                cy,
                radius * 0.05,
                cx,
                cy,
                radius
            );


        gradient.addColorStop(
            0,
            color
        );


        gradient.addColorStop(
            0.55,
            color
        );


        gradient.addColorStop(
            1,
            "rgba(0,0,0,0)"
        );


        ctx.fillStyle =
            gradient;


        ctx.beginPath();

        ctx.arc(
            cx,
            cy,
            radius,
            0,
            Math.PI * 2
        );

        ctx.fill();
    }


    /* ================================================
       ANIMATION
    ================================================ */

    let lastTime = 0;

    let elapsed = 0;


    function animate(timestamp) {

        if (!lastTime) {
            lastTime = timestamp;
        }


        const delta =
            Math.min(
                timestamp - lastTime,
                50
            );


        lastTime =
            timestamp;


        elapsed +=
            delta * 0.001;


        /* Base */

        ctx.fillStyle =
            "#10052f";


        ctx.fillRect(
            0,
            0,
            width,
            height
        );


        /* Main liquid */

        ribbons.forEach(
            ribbon => {

                drawRibbon(
                    ribbon,
                    elapsed
                );

            }
        );


        /* Deep liquid masses */

        drawMass(
            0.12,
            0.28,
            height * 0.34,
            "#4515b8",
            elapsed,
            0.72,
            0
        );


        drawMass(
            0.53,
            0.16,
            height * 0.30,
            "#701ce0",
            elapsed,
            0.58,
            2
        );


        drawMass(
            0.90,
            0.34,
            height * 0.38,
            "#182c91",
            elapsed,
            0.64,
            4
        );


        drawMass(
            0.36,
            0.76,
            height * 0.32,
            "#3512a0",
            elapsed,
            0.52,
            6
        );


        drawMass(
            0.78,
            0.76,
            height * 0.34,
            "#4215b7",
            elapsed,
            0.68,
            3
        );


        requestAnimationFrame(
            animate
        );

    }


    requestAnimationFrame(
        animate
    );

})();