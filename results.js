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
let votes = [];


document.addEventListener(
    "DOMContentLoaded",
    initializeResults
);


async function initializeResults() {

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


    try {

        await loadPage(slug);

        await loadVotes();

        subscribeToVotes();

    }

    catch (error) {

        console.error(error);

        showError(
            error.message ||
            "Unable to load results."
        );

    }

}


/* =========================================
   LOAD PAGE
========================================= */

async function loadPage(slug) {

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


    if (error || !data) {

        throw new Error(
            "Voting page not found."
        );

    }


    currentPage = data;


    document.title =
        `Live Results | ${data.title}`;


    document.getElementById(
        "resultTitle"
    ).textContent =
        data.title;


    document.getElementById(
        "resultImage1Name"
    ).textContent =
        data.image1_name;


    document.getElementById(
        "resultImage2Name"
    ).textContent =
        data.image2_name;

}


/* =========================================
   LOAD VOTES
========================================= */

async function loadVotes() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("votes")
            .select(
                "id, voter_name, vote, comment, created_at"
            )
            .eq(
                "page_id",
                currentPage.id
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        throw error;

    }


    votes =
        data || [];


    renderResults();

}


/* =========================================
   REALTIME
========================================= */

function subscribeToVotes() {

    supabaseClient
        .channel(
            `live-results-${currentPage.id}`
        )
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "votes",
                filter:
                    `page_id=eq.${currentPage.id}`
            },
            function(payload) {

                loadVotes();

            }
        )
        .subscribe();

}


/* =========================================
   RENDER
========================================= */

function renderResults() {

    const vote1 =
        votes.filter(
            vote =>
                Number(vote.vote) === 1
        ).length;


    const vote2 =
        votes.filter(
            vote =>
                Number(vote.vote) === 2
        ).length;


    const total =
        vote1 + vote2;


    const percentage1 =
        total === 0
            ? 0
            : Math.round(
                (vote1 / total) * 100
            );


    const percentage2 =
        total === 0
            ? 0
            : Math.round(
                (vote2 / total) * 100
            );


    document.getElementById(
        "resultVote1"
    ).textContent =
        vote1;


    document.getElementById(
        "resultVote2"
    ).textContent =
        vote2;


    document.getElementById(
        "resultPercentage1"
    ).textContent =
        percentage1;


    document.getElementById(
        "resultPercentage2"
    ).textContent =
        percentage2;


    document.getElementById(
        "resultBar1"
    ).style.width =
        `${percentage1}%`;


    document.getElementById(
        "resultBar2"
    ).style.width =
        `${percentage2}%`;


    renderWinner(
        vote1,
        vote2
    );


    renderComments();


    document.getElementById(
        "loadingResults"
    ).classList.add(
        "hidden"
    );


    document.getElementById(
        "resultsContent"
    ).classList.remove(
        "hidden"
    );

}


/* =========================================
   WINNER
========================================= */

function renderWinner(
    vote1,
    vote2
) {

    const winnerName =
        document.getElementById(
            "winnerName"
        );


    const winnerVotes =
        document.getElementById(
            "winnerVotes"
        );


    const winnerStatus =
        document.getElementById(
            "winnerStatus"
        );


    if (vote1 === 0 && vote2 === 0) {

        winnerName.textContent =
            "No votes yet";


        winnerVotes.textContent =
            "Be the first to vote";


        winnerStatus.textContent =
            "";

        return;

    }


    if (vote1 === vote2) {

        winnerName.textContent =
            "It's a tie!";


        winnerVotes.textContent =
            `${vote1} vote${vote1 === 1 ? "" : "s"} each`;


        winnerStatus.textContent =
            `${currentPage.image1_name} and ${currentPage.image2_name} are currently tied.`;

        return;

    }


    const image1Won =
        vote1 > vote2;


    const name =
        image1Won
            ? currentPage.image1_name
            : currentPage.image2_name;


    const count =
        Math.max(
            vote1,
            vote2
        );


    winnerName.textContent =
        name;


    winnerVotes.textContent =
        `${count} vote${count === 1 ? "" : "s"}`;


    winnerStatus.textContent =
        "Currently leading";

}


/* =========================================
   COMMENTS
========================================= */

function renderComments() {

    const container =
        document.getElementById(
            "commentsList"
        );


    const comments =
        votes.filter(
            vote =>
                vote.comment &&
                vote.comment.trim()
        );


    document.getElementById(
        "commentCount"
    ).textContent =
        `${comments.length} comment${comments.length === 1 ? "" : "s"}`;


    if (!comments.length) {

        container.innerHTML = `

            <div class="no-comments">

                No comments yet.

                Be the first person to share
                your thoughts.

            </div>

        `;

        return;

    }


    container.innerHTML =
        comments.map(
            vote => `

                <article class="comment-card">

                    <div class="comment-avatar">

                        ${escapeHtml(
                            vote.voter_name
                                .charAt(0)
                                .toUpperCase()
                        )}

                    </div>


                    <div class="comment-body">

                        <div class="comment-top">

                            <strong>
                                ${escapeHtml(
                                    vote.voter_name
                                )}
                            </strong>

                            <span>
                                ${formatDate(
                                    vote.created_at
                                )}
                            </span>

                        </div>


                        <p>
                            ${escapeHtml(
                                vote.comment
                            )}
                        </p>


                        <span class="voted-for">

                            Voted for

                            ${
                                vote.vote === 1
                                    ? escapeHtml(
                                        currentPage.image1_name
                                    )
                                    : escapeHtml(
                                        currentPage.image2_name
                                    )
                            }

                        </span>

                    </div>

                </article>

            `
        )
        .join("");

}


/* =========================================
   DATE
========================================= */

function formatDate(date) {

    if (!date) {

        return "";

    }


    return new Date(
        date
    ).toLocaleString(
        undefined,
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    );

}


/* =========================================
   ERROR
========================================= */

function showError(message) {

    document.getElementById(
        "loadingResults"
    ).classList.add(
        "hidden"
    );


    const error =
        document.getElementById(
            "resultsError"
        );


    error.textContent =
        message;


    error.classList.remove(
        "hidden"
    );

}


/* =========================================
   ESCAPE HTML
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