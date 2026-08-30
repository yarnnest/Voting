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


document.addEventListener(
    "DOMContentLoaded",
    initialize
);


async function initialize() {

    try {

        await ensureAnonymousLogin();

        const params =
            new URLSearchParams(
                window.location.search
            );

        const slug =
            params.get("slug");


        if (!slug) {

            showError(
                "No voting page was specified."
            );

            return;
        }


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
        await supabaseClient.auth.signInAnonymously();


    if (error) {

        throw error;

    }

}


async function loadVotingPage(slug) {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("voting_pages")
            .select("*")
            .eq("slug", slug)
            .eq("is_published", true)
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
    ).classList.remove("hidden");


    await checkExistingVote();

}


async function checkExistingVote() {

    const {
        data: {
            user
        }
    } =
        await supabaseClient.auth.getUser();


    if (!user) {

        return;

    }


    const {
        data
    } =
        await supabaseClient
            .from("votes")
            .select("id")
            .eq("page_id", currentPage.id)
            .eq("user_id", user.id)
            .maybeSingle();


    if (data) {

        disableVotingForm();

        showVoteMessage(
            "You have already voted on this page.",
            "success"
        );

    }

}


function disableVotingForm() {

    document.querySelectorAll(
        'input[name="vote"]'
    ).forEach(
        input => input.disabled = true
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

    button.textContent =
        "Submitting...";


    try {

        const {
            data: {
                user
            }
        } =
            await supabaseClient.auth.getUser();


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
            "Your vote has been submitted successfully.",
            "success"
        );

    }

    catch (error) {

        console.error(error);

        button.disabled = false;

        button.textContent =
            "Submit Vote";


        showVoteMessage(
            error.message ||
            "Unable to submit your vote.",
            "error"
        );

    }

}


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


function showError(message) {

    document.getElementById(
        "loading"
    ).classList.add("hidden");


    const element =
        document.getElementById(
            "errorMessage"
        );


    element.textContent =
        message;


    element.classList.remove(
        "hidden"
    );

}


/* ==============================
   IMAGE VIEWER
================================ */


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

}


/* Mouse wheel zoom */

document.getElementById(
    "zoomContainer"
).addEventListener(
    "wheel",
    function(event) {

        event.preventDefault();


        const amount =
            event.deltaY < 0
                ? 0.15
                : -0.15;


        scale =
            Math.max(
                1,
                Math.min(
                    6,
                    scale + amount
                )
            );


        updateImageTransform();

    },
    { passive: false }
);


/* Touch controls */

const zoomContainer =
    document.getElementById(
        "zoomContainer"
    );


zoomContainer.addEventListener(
    "touchstart",
    function(event) {

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
    { passive: false }
);


zoomContainer.addEventListener(
    "touchmove",
    function(event) {

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
                (distance / initialDistance);


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
    { passive: false }
);


zoomContainer.addEventListener(
    "touchend",
    function() {

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


document.addEventListener(
    "keydown",
    function(event) {

        if (
            event.key === "Escape"
        ) {

            closeImage();

        }

    }
);