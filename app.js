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
   LIQUID PURPLE BACKGROUND
   Lightweight canvas animation
========================================================= */

(function () {

    const canvas = document.createElement("canvas");

    canvas.id = "liquid-bg";

    document.body.prepend(canvas);

    const ctx = canvas.getContext("2d", {
        alpha: true
    });

    let w = 0;
    let h = 0;

    let scale = 0.45;

    function resize() {

        w = Math.max(
            320,
            Math.floor(window.innerWidth * scale)
        );

        h = Math.max(
            240,
            Math.floor(window.innerHeight * scale)
        );

        canvas.width = w;
        canvas.height = h;

        canvas.style.width = "100vw";
        canvas.style.height = "100vh";
    }

    resize();

    window.addEventListener(
        "resize",
        resize,
        {
            passive: true
        }
    );


    /*
       Liquid blobs.

       These are deliberately large.
       They overlap to create ONE continuous
       flowing liquid shape instead of circles.
    */

    const liquid = [

        {
            x: 0.10,
            y: 0.48,
            size: 0.58,
            speed: 0.42,
            phase: 0.0,
            color: [62, 10, 180]
        },

        {
            x: 0.34,
            y: 0.30,
            size: 0.52,
            speed: 0.34,
            phase: 2.0,
            color: [112, 20, 235]
        },

        {
            x: 0.58,
            y: 0.48,
            size: 0.62,
            speed: 0.38,
            phase: 4.0,
            color: [40, 20, 210]
        },

        {
            x: 0.82,
            y: 0.35,
            size: 0.55,
            speed: 0.30,
            phase: 1.0,
            color: [0, 105, 220]
        },

        {
            x: 0.94,
            y: 0.62,
            size: 0.52,
            speed: 0.40,
            phase: 3.0,
            color: [0, 175, 225]
        }

    ];


    /*
       Dark purple base.
    */

    function drawBase() {

        ctx.fillStyle =
            "rgba(18, 5, 65, 0.96)";

        ctx.fillRect(
            0,
            0,
            w,
            h
        );
    }


    /*
       Draw a soft liquid mass.

       Important:
       This uses translucent overlapping shapes.
       There are NO blur filters and NO CSS gradients.
    */

    function drawLiquid(blob, time) {

        const movementX =
            Math.sin(
                time * blob.speed +
                blob.phase
            ) * w * 0.16;


        const movementY =
            Math.sin(
                time * blob.speed * 0.72 +
                blob.phase * 1.7
            ) * h * 0.15;


        const x =
            w * blob.x +
            movementX;


        const y =
            h * blob.y +
            movementY;


        const radius =
            Math.min(w, h) *
            blob.size;


        /*
           Use many transparent layers.

           This produces a liquid transition
           without using blur().
        */

        for (
            let i = 8;
            i >= 1;
            i--
        ) {

            const ratio =
                i / 8;


            const rx =
                radius *
                (0.72 + ratio * 0.48);


            const ry =
                radius *
                (0.32 + ratio * 0.26);


            const wave =
                Math.sin(
                    time *
                    blob.speed *
                    1.8 +
                    blob.phase +
                    i
                );


            const offsetX =
                wave *
                radius *
                0.13;


            const offsetY =
                Math.cos(
                    time *
                    blob.speed *
                    1.3 +
                    i
                ) *
                radius *
                0.08;


            ctx.beginPath();


            ctx.ellipse(
                x + offsetX,
                y + offsetY,
                rx,
                ry,
                wave * 0.16,
                0,
                Math.PI * 2
            );


            const alpha =
                0.025 +
                (1 - ratio) * 0.025;


            ctx.fillStyle =
                `rgba(
                    ${blob.color[0]},
                    ${blob.color[1]},
                    ${blob.color[2]},
                    ${alpha}
                )`;


            ctx.fill();
        }
    }


    /*
       Long flowing liquid streams.

       These connect the large masses so the result
       feels like one continuous body of water.
    */

    function drawFlow(time) {

        const lines = 7;


        for (
            let i = 0;
            i < lines;
            i++
        ) {

            const baseY =
                h *
                (
                    0.20 +
                    i * 0.11
                );


            ctx.beginPath();


            for (
                let x = -80;
                x <= w + 80;
                x += 20
            ) {

                const normalized =
                    x / w;


                const wave1 =
                    Math.sin(
                        normalized * 4.0 +
                        time * 0.48 +
                        i
                    );


                const wave2 =
                    Math.sin(
                        normalized * 8.0 -
                        time * 0.32 +
                        i * 0.8
                    );


                const y =
                    baseY +
                    wave1 * h * 0.08 +
                    wave2 * h * 0.035;


                if (x === -80) {

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


            ctx.lineTo(
                w + 80,
                baseY + h * 0.11
            );

            ctx.lineTo(
                -80,
                baseY + h * 0.11
            );

            ctx.closePath();


            const colors = [

                "rgba(67, 18, 190, 0.035)",

                "rgba(103, 25, 225, 0.04)",

                "rgba(20, 80, 210, 0.035)",

                "rgba(0, 145, 220, 0.035)"

            ];


            ctx.fillStyle =
                colors[
                    i %
                    colors.length
                ];


            ctx.fill();
        }
    }


    /*
       Bright liquid highlights.

       These are very subtle and give the water
       some dimensional movement.
    */

    function drawHighlights(time) {

        for (
            let i = 0;
            i < 3;
            i++
        ) {

            ctx.beginPath();


            for (
                let x = -50;
                x <= w + 50;
                x += 25
            ) {

                const nx =
                    x / w;


                const y =
                    h *
                    (
                        0.28 +
                        i * 0.22
                    )
                    +
                    Math.sin(
                        nx * 5.0 +
                        time * 0.55 +
                        i
                    ) *
                    h *
                    0.075;


                if (x === -50) {

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


            ctx.strokeStyle =
                "rgba(100, 170, 255, 0.08)";


            ctx.lineWidth =
                Math.max(
                    1,
                    h * 0.008
                );


            ctx.stroke();
        }
    }


    /*
       Animation
    */

    let lastFrame = 0;

    const frameInterval = 45;

    let time = 0;


    function animate(timestamp) {

        if (
            timestamp -
            lastFrame <
            frameInterval
        ) {

            requestAnimationFrame(
                animate
            );

            return;
        }


        const delta =
            Math.min(
                timestamp - lastFrame,
                100
            );


        lastFrame =
            timestamp;


        time +=
            delta * 0.001;


        ctx.clearRect(
            0,
            0,
            w,
            h
        );


        drawBase();


        /*
           Large liquid bodies
        */

        liquid.forEach(
            blob => {

                drawLiquid(
                    blob,
                    time
                );

            }
        );


        /*
           Connecting water flow
        */

        drawFlow(time);


        /*
           Subtle highlights
        */

        drawHighlights(time);


        requestAnimationFrame(
            animate
        );
    }


    requestAnimationFrame(
        animate
    );

})();