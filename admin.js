const SUPABASE_URL =
    "https://wslzxmwtvgrlatxfldfo.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_mzXpQzrV5FWTFYzMAn9ZGw_Vf9rbD_q";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


let pages = [];


document.addEventListener(
    "DOMContentLoaded",
    initializeAdmin
);


async function initializeAdmin() {

    const {
        data: {
            session
        }
    } =
        await supabaseClient.auth.getSession();


    if (session) {

        await showAdmin();

    }

    else {

        showLogin();

    }

}


function showLogin() {

    document.getElementById(
        "loginSection"
    ).classList.remove("hidden");


    document.getElementById(
        "adminSection"
    ).classList.add("hidden");

}


async function showAdmin() {

    document.getElementById(
        "loginSection"
    ).classList.add("hidden");


    document.getElementById(
        "adminSection"
    ).classList.remove("hidden");


    await loadPages();

}


document.getElementById(
    "loginForm"
).addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();


        const email =
            document.getElementById(
                "email"
            ).value.trim();


        const password =
            document.getElementById(
                "password"
            ).value;


        const {
            error
        } =
            await supabaseClient.auth.signInWithPassword({

                email,
                password

            });


        if (error) {

            showMessage(
                "loginMessage",
                error.message,
                "error"
            );

            return;

        }


        await showAdmin();

    }
);


document.getElementById(
    "logoutButton"
).addEventListener(
    "click",
    async function() {

        await supabaseClient.auth.signOut();

        showLogin();

    }
);


/* ==============================
   LOAD PAGES
================================ */


async function loadPages() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("voting_pages")
            .select("*")
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(error);

        document.getElementById(
            "pagesList"
        ).textContent =
            error.message;

        return;

    }


    pages = data || [];

    renderPages();

}


async function renderPages() {

    const container =
        document.getElementById(
            "pagesList"
        );


    if (!pages.length) {

        container.innerHTML =
            "<p>No voting pages created yet.</p>";

        return;

    }


    let html = "";


    for (
        const page of pages
    ) {

        const {
            count
        } =
            await getVoteCount(
                page.id
            );


        const url =
            `${window.location.origin}${window.location.pathname.replace("admin.html", "index.html")}?slug=${encodeURIComponent(page.slug)}`;


        html += `

        <div class="page-item">

            <div>

                <h3>
                    ${escapeHtml(page.title)}
                </h3>

                <p>
                    Slug:
                    ${escapeHtml(page.slug)}
                </p>

                <p>
                    Status:
                    ${page.is_published ? "Published" : "Unpublished"}
                </p>

                <p>
                    Total Votes:
                    ${count}
                </p>

                <p>
                    <a
                        href="${url}"
                        target="_blank">
                        Open Voting Page
                    </a>
                </p>

            </div>

            <div class="button-row">

                <button
                    onclick="editPage('${page.id}')">
                    Edit
                </button>

                <button
                    onclick="copyLink('${url}')">
                    Copy Link
                </button>

                <button
                    class="danger-button"
                    onclick="deletePage('${page.id}')">
                    Delete
                </button>

            </div>

        </div>

        `;

    }


    container.innerHTML =
        html;

}


async function getVoteCount(
    pageId
) {

    const {
        count
    } =
        await supabaseClient
            .from("votes")
            .select(
                "*",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq(
                "page_id",
                pageId
            );


    return {
        count: count || 0
    };

}


/* ==============================
   CREATE / EDIT PAGE
================================ */


document.getElementById(
    "pageForm"
).addEventListener(
    "submit",
    savePage
);


async function savePage(event) {

    event.preventDefault();


    const pageId =
        document.getElementById(
            "editingPageId"
        ).value;


    const title =
        document.getElementById(
            "pageTitleInput"
        ).value.trim();


    const slug =
        document.getElementById(
            "slugInput"
        ).value
            .trim()
            .toLowerCase()
            .replace(
                /[^a-z0-9-]/g,
                "-"
            )
            .replace(
                /-+/g,
                "-"
            );


    const image1Name =
        document.getElementById(
            "image1NameInput"
        ).value.trim();


    const image2Name =
        document.getElementById(
            "image2NameInput"
        ).value.trim();


    const image1File =
        document.getElementById(
            "image1File"
        ).files[0];


    const image2File =
        document.getElementById(
            "image2File"
        ).files[0];


    const published =
        document.getElementById(
            "publishedInput"
        ).checked;


    if (
        !pageId &&
        (!image1File || !image2File)
    ) {

        showMessage(
            "pageMessage",
            "Please select both images.",
            "error"
        );

        return;

    }


    try {

        let image1Url = null;

        let image2Url = null;


        const existing =
            pageId
                ? pages.find(
                    page =>
                        page.id === pageId
                )
                : null;


        if (image1File) {

            image1Url =
                await uploadImage(
                    image1File
                );

        }


        if (image2File) {

            image2Url =
                await uploadImage(
                    image2File
                );

        }


        const pageData = {

            title,

            slug,

            image1_name:
                image1Name,

            image2_name:
                image2Name,

            is_published:
                published

        };


        if (image1Url) {

            pageData.image1_url =
                image1Url;

        }

        else if (existing) {

            pageData.image1_url =
                existing.image1_url;

        }


        if (image2Url) {

            pageData.image2_url =
                image2Url;

        }

        else if (existing) {

            pageData.image2_url =
                existing.image2_url;

        }


        let result;


        if (pageId) {

            result =
                await supabaseClient
                    .from("voting_pages")
                    .update(pageData)
                    .eq(
                        "id",
                        pageId
                    );

        }

        else {

            result =
                await supabaseClient
                    .from("voting_pages")
                    .insert(pageData);

        }


        if (result.error) {

            throw result.error;

        }


        showMessage(
            "pageMessage",
            pageId
                ? "Page updated successfully."
                : "Page created successfully.",
            "success"
        );


        resetForm();

        await loadPages();

    }

    catch (error) {

        console.error(error);

        showMessage(
            "pageMessage",
            error.message,
            "error"
        );

    }

}


async function uploadImage(file) {

    const extension =
        file.name
            .split(".")
            .pop()
            .toLowerCase();


    const fileName =
        `${crypto.randomUUID()}.${extension}`;


    const path =
        `images/${fileName}`;


    const {
        error
    } =
        await supabaseClient.storage
            .from("voting-images")
            .upload(
                path,
                file,
                {
                    cacheControl:
                        "3600",
                    upsert:
                        false
                }
            );


    if (error) {

        throw error;

    }


    const {
        data
    } =
        supabaseClient.storage
            .from("voting-images")
            .getPublicUrl(
                path
            );


    return data.publicUrl;

}


/* ==============================
   EDIT
================================ */


function editPage(pageId) {

    const page =
        pages.find(
            item =>
                item.id === pageId
        );


    if (!page) {

        return;

    }


    document.getElementById(
        "editingPageId"
    ).value =
        page.id;


    document.getElementById(
        "pageTitleInput"
    ).value =
        page.title;


    document.getElementById(
        "slugInput"
    ).value =
        page.slug;


    document.getElementById(
        "image1NameInput"
    ).value =
        page.image1_name;


    document.getElementById(
        "image2NameInput"
    ).value =
        page.image2_name;


    document.getElementById(
        "publishedInput"
    ).checked =
        page.is_published;


    document.getElementById(
        "savePageButton"
    ).textContent =
        "Update Page";


    document.getElementById(
        "cancelEditButton"
    ).classList.remove(
        "hidden"
    );


    window.scrollTo(
        {
            top: 0,
            behavior: "smooth"
        }
    );

}


document.getElementById(
    "cancelEditButton"
).addEventListener(
    "click",
    resetForm
);


function resetForm() {

    document.getElementById(
        "pageForm"
    ).reset();


    document.getElementById(
        "editingPageId"
    ).value =
        "";


    document.getElementById(
        "publishedInput"
    ).checked =
        true;


    document.getElementById(
        "savePageButton"
    ).textContent =
        "Create Page";


    document.getElementById(
        "cancelEditButton"
    ).classList.add(
        "hidden"
    );

}


/* ==============================
   DELETE
================================ */


async function deletePage(
    pageId
) {

    if (
        !confirm(
            "Are you sure you want to delete this voting page?"
        )
    ) {

        return;

    }


    const {
        error
    } =
        await supabaseClient
            .from("voting_pages")
            .delete()
            .eq(
                "id",
                pageId
            );


    if (error) {

        alert(
            error.message
        );

        return;

    }


    await loadPages();

}


/* ==============================
   COPY LINK
================================ */


async function copyLink(url) {

    await navigator.clipboard.writeText(
        url
    );


    alert(
        "Voting link copied."
    );

}


/* ==============================
   HELPERS
================================ */


function showMessage(
    id,
    message,
    type
) {

    const element =
        document.getElementById(id);


    element.textContent =
        message;


    element.className =
        `message ${type}`;

}


function escapeHtml(
    value
) {

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