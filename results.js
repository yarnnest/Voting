const SUPABASE_URL = "https://wslzxmwtvgrlatxfldfo.supabase.co";
const SUPABASE_KEY = "sb_publishable_mzXpQzrV5FWTFYzMAn9ZGw_Vf9rbD_q";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentPage = null;
let votes = [];

const $ = id => document.getElementById(id);

window.addEventListener("DOMContentLoaded", initializeResults);

async function initializeResults() {
    const slug = new URLSearchParams(window.location.search).get("slug");
    if (!slug) {
        showError("No voting page was specified.");
        return;
    }

    try {
        await loadPage(slug);
        await loadVotes();
        subscribeToVotes();
    } catch (error) {
        console.error(error);
        showError(error.message || "Unable to load results.");
    }
}

async function loadPage(slug) {
    const { data, error } = await supabaseClient
        .from("voting_pages")
        .select("*")
        .eq("slug", slug)
        .eq("is_published", true)
        .single();

    if (error || !data) throw new Error("Voting page not found.");

    currentPage = data;
    document.title = `Live Results | ${data.title}`;
    $("resultTitle").textContent = data.title;
    $("resultImage1Name").textContent = data.image1_name;
    $("resultImage2Name").textContent = data.image2_name;

    $("resultImage1").src = data.image1_url;
    $("resultImage1").alt = data.image1_name;
    $("resultImage2").src = data.image2_url;
    $("resultImage2").alt = data.image2_name;
}

async function loadVotes() {
    const { data, error } = await supabaseClient
        .from("votes")
        .select("id, voter_name, vote, comment, created_at")
        .eq("page_id", currentPage.id)
        .order("created_at", { ascending: false });

    if (error) throw error;
    votes = data || [];
    renderResults();
}

function subscribeToVotes() {
    supabaseClient
        .channel(`live-results-${currentPage.id}`)
        .on("postgres_changes", {
            event: "*",
            schema: "public",
            table: "votes",
            filter: `page_id=eq.${currentPage.id}`
        }, () => loadVotes().catch(console.error))
        .subscribe();
}

function renderResults() {
    const vote1 = votes.filter(vote => Number(vote.vote) === 1).length;
    const vote2 = votes.filter(vote => Number(vote.vote) === 2).length;
    const total = vote1 + vote2;
    const percentage1 = total ? Math.round((vote1 / total) * 100) : 0;
    const percentage2 = total ? Math.round((vote2 / total) * 100) : 0;

    $("resultVote1").textContent = vote1;
    $("resultVote2").textContent = vote2;
    $("resultPercentage1").textContent = percentage1;
    $("resultPercentage2").textContent = percentage2;
    $("resultBar1").style.width = `${percentage1}%`;
    $("resultBar2").style.width = `${percentage2}%`;

    renderWinner(vote1, vote2);
    renderComments();
    $("loadingResults").classList.add("hidden");
    $("resultsContent").classList.remove("hidden");
}

function renderWinner(vote1, vote2) {
    if (vote1 === 0 && vote2 === 0) {
        $("winnerName").textContent = "No votes yet";
        $("winnerVotes").textContent = "Be the first to vote";
        $("winnerStatus").textContent = "";
        return;
    }

    if (vote1 === vote2) {
        $("winnerName").textContent = "It's a tie!";
        $("winnerVotes").textContent = `${vote1} vote${vote1 === 1 ? "" : "s"} each`;
        $("winnerStatus").textContent = `${currentPage.image1_name} and ${currentPage.image2_name} are currently tied.`;
        return;
    }

    const image1Won = vote1 > vote2;
    const name = image1Won ? currentPage.image1_name : currentPage.image2_name;
    const count = Math.max(vote1, vote2);

    $("winnerName").textContent = name;
    $("winnerVotes").textContent = `${count} vote${count === 1 ? "" : "s"}`;
    $("winnerStatus").textContent = "Currently leading";
}

function renderComments() {
    const container = $("commentsList");
    const comments = votes.filter(vote => vote.comment && vote.comment.trim());

    $("commentCount").textContent = `${comments.length} comment${comments.length === 1 ? "" : "s"}`;

    if (!comments.length) {
        container.innerHTML = `<div class="no-comments">No comments yet. Be the first person to share your thoughts.</div>`;
        return;
    }

    container.innerHTML = comments.map(vote => `
        <article class="comment-card">
            <div class="comment-avatar">${escapeHtml((vote.voter_name || "?").charAt(0).toUpperCase())}</div>
            <div class="comment-body">
                <div class="comment-top">
                    <strong>${escapeHtml(vote.voter_name || "Anonymous")}</strong>
                    <span>${formatDate(vote.created_at)}</span>
                </div>
                <p>${escapeHtml(vote.comment)}</p>
                <span class="voted-for">Voted for ${vote.vote === 1 ? escapeHtml(currentPage.image1_name) : escapeHtml(currentPage.image2_name)}</span>
            </div>
        </article>
    `).join("");
}

function formatDate(date) {
    if (!date) return "";
    return new Date(date).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function showError(message) {
    $("loadingResults").classList.add("hidden");
    $("resultsError").textContent = message;
    $("resultsError").classList.remove("hidden");
}

function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
