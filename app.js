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
   GPU FLOWING INK BACKGROUND
   JavaScript + WebGL
========================================================= */

(function createInkBackground() {

    const canvas = document.createElement("canvas");

    canvas.id = "ink-background";

    canvas.style.position = "fixed";
    canvas.style.left = "0";
    canvas.style.top = "0";
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "0";

    document.body.prepend(canvas);


    /* Put all website content above the canvas */

    Array.from(document.body.children).forEach(element => {

        if (element !== canvas) {

            element.style.position =
                element.style.position || "relative";

            element.style.zIndex =
                element.style.zIndex || "1";
        }
    });


    const gl =
        canvas.getContext("webgl",
        {
            alpha: true,
            antialias: false,
            powerPreference: "high-performance"
        });


    if (!gl) {

        console.warn(
            "WebGL is not available on this device."
        );

        return;
    }


    /* =====================================================
       VERTEX SHADER
    ===================================================== */

    const vertexShaderSource = `

        attribute vec2 position;

        void main() {

            gl_Position =
                vec4(position, 0.0, 1.0);

        }

    `;


    /* =====================================================
       FRAGMENT SHADER
    ===================================================== */

    const fragmentShaderSource = `

        precision highp float;

        uniform vec2 resolution;
        uniform float time;


        /* -----------------------------------------------
           Basic random
        ------------------------------------------------ */

        float random(vec2 p) {

            return fract(
                sin(
                    dot(
                        p,
                        vec2(
                            127.1,
                            311.7
                        )
                    )
                ) * 43758.5453123
            );

        }


        /* -----------------------------------------------
           Smooth noise
        ------------------------------------------------ */

        float noise(vec2 p) {

            vec2 i = floor(p);
            vec2 f = fract(p);

            f = f * f * (3.0 - 2.0 * f);

            float a = random(i);
            float b = random(i + vec2(1.0, 0.0));
            float c = random(i + vec2(0.0, 1.0));
            float d = random(i + vec2(1.0, 1.0));

            return mix(
                mix(a, b, f.x),
                mix(c, d, f.x),
                f.y
            );

        }


        /* -----------------------------------------------
           Fractal noise
        ------------------------------------------------ */

        float fbm(vec2 p) {

            float value = 0.0;

            float amplitude = 0.5;

            for (int i = 0; i < 5; i++) {

                value +=
                    amplitude *
                    noise(p);

                p *= 2.0;

                amplitude *= 0.5;
            }

            return value;

        }


        /* -----------------------------------------------
           Main liquid distortion
        ------------------------------------------------ */

        void main() {

            vec2 uv =
                gl_FragCoord.xy /
                resolution.xy;


            float aspect =
                resolution.x /
                resolution.y;


            vec2 p = uv;

            p.x *= aspect;


            /* -------------------------------------------
               Fast horizontal water movement
            ------------------------------------------- */

            float movement =
                time * 0.18;


            vec2 flow =
                vec2(
                    movement,
                    sin(time * 0.35) * 0.08
                );


            /* -------------------------------------------
               Large organic deformation
            ------------------------------------------- */

            vec2 warp =
                vec2(
                    fbm(p * 2.0 + flow),
                    fbm(
                        p * 2.0
                        + flow
                        + vec2(4.7, 2.1)
                    )
                );


            p +=
                (warp - 0.5)
                * 0.42;


            /* -------------------------------------------
               Long flowing ink bands
            ------------------------------------------- */

            float wave1 =
                sin(
                    p.y * 5.0
                    + p.x * 2.5
                    + time * 0.65
                    + fbm(p * 2.5) * 3.0
                );


            float wave2 =
                sin(
                    p.y * 9.0
                    - p.x * 3.0
                    - time * 0.48
                    + fbm(p * 3.0) * 4.0
                );


            float flowShape =
                wave1 * 0.55
                + wave2 * 0.25;


            /* -------------------------------------------
               Organic liquid mask
            ------------------------------------------- */

            float liquid =
                fbm(
                    p * 2.2
                    + vec2(
                        time * 0.12,
                        -time * 0.04
                    )
                );


            liquid =
                liquid
                + flowShape * 0.18;


            /* -------------------------------------------
               Purple ink concentration
            ------------------------------------------- */

            float ink =
                smoothstep(
                    0.42,
                    0.68,
                    liquid
                );


            /* Additional flowing areas */

            float ink2 =
                smoothstep(
                    0.47,
                    0.72,
                    fbm(
                        p * 3.8
                        - vec2(
                            time * 0.18,
                            time * 0.06
                        )
                    )
                );


            ink =
                max(
                    ink,
                    ink2 * 0.55
                );


            /* -------------------------------------------
               Purple / violet liquid colours
            ------------------------------------------- */

            vec3 lightPurple =
                vec3(
                    0.56,
                    0.20,
                    0.95
                );


            vec3 deepPurple =
                vec3(
                    0.20,
                    0.035,
                    0.55
                );


            vec3 pinkPurple =
                vec3(
                    0.78,
                    0.16,
                    0.72
                );


            vec3 colour =
                mix(
                    lightPurple,
                    deepPurple,
                    smoothstep(
                        0.40,
                        0.85,
                        liquid
                    )
                );


            colour =
                mix(
                    colour,
                    pinkPurple,
                    ink2 * 0.35
                );


            /* -------------------------------------------
               Fade edges
            ------------------------------------------- */

            float edgeFade =
                smoothstep(
                    0.02,
                    0.16,
                    uv.x
                )
                *
                smoothstep(
                    0.02,
                    0.16,
                    1.0 - uv.x
                )
                *
                smoothstep(
                    0.02,
                    0.14,
                    uv.y
                )
                *
                smoothstep(
                    0.02,
                    0.14,
                    1.0 - uv.y
                );


            float alpha =
                ink
                * 0.78
                * edgeFade;


            /* -------------------------------------------
               Transparent background
            ------------------------------------------- */

            gl_FragColor =
                vec4(
                    colour,
                    alpha
                );

        }

    `;


    /* =====================================================
       SHADER COMPILATION
    ===================================================== */

    function compileShader(type, source) {

        const shader =
            gl.createShader(type);

        gl.shaderSource(
            shader,
            source
        );

        gl.compileShader(shader);


        if (
            !gl.getShaderParameter(
                shader,
                gl.COMPILE_STATUS
            )
        ) {

            console.error(
                gl.getShaderInfoLog(shader)
            );

            gl.deleteShader(shader);

            return null;
        }


        return shader;
    }


    const vertexShader =
        compileShader(
            gl.VERTEX_SHADER,
            vertexShaderSource
        );


    const fragmentShader =
        compileShader(
            gl.FRAGMENT_SHADER,
            fragmentShaderSource
        );


    if (!vertexShader || !fragmentShader) {

        return;
    }


    /* =====================================================
       PROGRAM
    ===================================================== */

    const program =
        gl.createProgram();


    gl.attachShader(
        program,
        vertexShader
    );

    gl.attachShader(
        program,
        fragmentShader
    );

    gl.linkProgram(program);


    if (
        !gl.getProgramParameter(
            program,
            gl.LINK_STATUS
        )
    ) {

        console.error(
            gl.getProgramInfoLog(program)
        );

        return;
    }


    gl.useProgram(program);


    /* =====================================================
       FULL SCREEN QUAD
    ===================================================== */

    const buffer =
        gl.createBuffer();


    gl.bindBuffer(
        gl.ARRAY_BUFFER,
        buffer
    );


    gl.bufferData(
        gl.ARRAY_BUFFER,

        new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,

            -1,  1,
             1, -1,
             1,  1
        ]),

        gl.STATIC_DRAW
    );


    const positionLocation =
        gl.getAttribLocation(
            program,
            "position"
        );


    gl.enableVertexAttribArray(
        positionLocation
    );


    gl.vertexAttribPointer(
        positionLocation,
        2,
        gl.FLOAT,
        false,
        0,
        0
    );


    const resolutionLocation =
        gl.getUniformLocation(
            program,
            "resolution"
        );


    const timeLocation =
        gl.getUniformLocation(
            program,
            "time"
        );


    /* =====================================================
       PERFORMANCE SETTINGS
    ===================================================== */

    let pixelRatio =
        Math.min(
            window.devicePixelRatio || 1,
            1.5
        );


    function resize() {

        const width =
            window.innerWidth;


        const height =
            window.innerHeight;


        canvas.width =
            Math.floor(
                width * pixelRatio
            );


        canvas.height =
            Math.floor(
                height * pixelRatio
            );


        gl.viewport(
            0,
            0,
            canvas.width,
            canvas.height
        );


        gl.uniform2f(
            resolutionLocation,
            canvas.width,
            canvas.height
        );
    }


    resize();


    window.addEventListener(
        "resize",
        resize
    );


    /* =====================================================
       ANIMATION
    ===================================================== */

    const start =
        performance.now();


    function animate(now) {

        const elapsed =
            (now - start) / 1000;


        gl.uniform1f(
            timeLocation,
            elapsed
        );


        gl.drawArrays(
            gl.TRIANGLES,
            0,
            6
        );


        requestAnimationFrame(
            animate
        );
    }


    requestAnimationFrame(
        animate
    );


})();