/* ========================================
   IMPERA — Auth & Store (localStorage)
   ----------------------------------------
   NOTE: localStorage demo auth. For production,
   move users/bookings to a real backend
   (Supabase/Firebase) and hash passwords server-side.
   ======================================== */

(function () {
    'use strict';

    // ================= CONFIG =================
    // CHANGE THESE to your own owner/admin credentials.
    const OWNER = {
        name: 'CEO',
        email: 'ceo@impera.com',
        password: 'ImperaCEO2026!',
        role: 'admin'
    };

    const K = {
        users: 'impera_users',
        session: 'impera_session',
        purchases: 'impera_purchases',
        bookings: 'impera_bookings'
    };

    // ================= HELPERS =================
    const read = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };
    const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
    const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const enc = (s) => btoa(unescape(encodeURIComponent('impera:' + s)));
    const cmp = (a, b) => enc(a) === b;

    function genPassword() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let out = '';
        for (let i = 0; i < 10; i++) out += chars[Math.floor(Math.random() * chars.length)];
        return out.slice(0, 5) + '-' + out.slice(5);
    }

    // ================= SEED OWNER =================
    function seed() {
        const users = read(K.users, []);
        if (!users.find(u => u.email.toLowerCase() === OWNER.email.toLowerCase())) {
            users.push({ id: uid(), name: OWNER.name, email: OWNER.email, pass: enc(OWNER.password), role: 'admin', createdAt: new Date().toISOString(), products: [] });
            write(K.users, users);
        }
    }
    seed();

    // ================= USERS =================
    const getUsers = () => read(K.users, []);
    const saveUsers = (u) => write(K.users, u);
    const findUser = (email) => getUsers().find(u => u.email.toLowerCase() === String(email || '').toLowerCase());

    function createUser(name, email, password, role) {
        const users = getUsers();
        if (findUser(email)) return { error: 'An account with this email already exists.' };
        const user = {
            id: uid(),
            name: name || 'Trader',
            email: String(email).toLowerCase(),
            pass: enc(password),
            role: role || 'client',
            createdAt: new Date().toISOString(),
            products: []
        };
        users.push(user);
        saveUsers(users);
        return { user };
    }

    // ================= PURCHASES =================
    const getPurchases = () => read(K.purchases, []);

    function addPurchase(record) {
        const purchases = getPurchases();
        if (!purchases.find(p => p.sessionId === record.sessionId)) {
            purchases.push(record);
            write(K.purchases, purchases);
        }
        // attach product to the user account
        const users = getUsers();
        const user = users.find(u => u.email === String(record.email || '').toLowerCase());
        if (user) {
            user.products = user.products || [];
            if (!user.products.find(p => p.sessionId === record.sessionId)) {
                user.products.push({
                    sessionId: record.sessionId,
                    bot: record.bot,
                    botName: record.botName,
                    licenceKey: record.licenceKey || null,
                    plan: record.plan || null,
                    date: record.date
                });
                saveUsers(users);
            }
        }
    }

    const isMentorship = (botKey) => botKey === 'mentor-monthly' || botKey === 'mentor-lifetime' || botKey === 'basic-membership';

    const TIER_MAP = { scalping: 'Scalping', 'impera-bot': 'Scalping', test: 'Scalping', gold: 'Gold', global: 'Global' };
    const IMPERA_API = 'https://impera-5b6l.onrender.com';

    function userProducts(email) {
        const u = findUser(email);
        return (u && u.products) || [];
    }

    // Pull this buyer's real purchases from the IMPERA server so the
    // dashboard works on any device / after clearing browser storage.
    async function syncFromServer(email) {
        if (!email) return 0;
        let base = IMPERA_API;
        try { base = localStorage.getItem('impera_api_url') || IMPERA_API; } catch (e) {}
        let data;
        try {
            const r = await fetch(base.replace(/\/$/, '') + '/api/products/' + encodeURIComponent(email));
            if (!r.ok) return 0;
            data = await r.json();
        } catch (e) { return 0; }
        if (!data || !Array.isArray(data.products)) return 0;
        let added = 0;
        data.products.forEach(p => {
            const rec = {
                sessionId: p.sessionId, bot: p.bot, botName: p.botName,
                licenceKey: p.licenceKey || null, plan: null, date: p.date
            };
            const purchases = getPurchases();
            if (!purchases.find(x => x.sessionId === rec.sessionId)) {
                purchases.push(Object.assign({ email: String(email).toLowerCase() }, rec));
                write(K.purchases, purchases);
                added++;
            }
            const users = getUsers();
            const u = users.find(x => x.email === String(email).toLowerCase());
            if (u) {
                u.products = u.products || [];
                if (!u.products.find(x => x.sessionId === rec.sessionId)) {
                    u.products.push(rec);
                    saveUsers(users);
                }
            }
        });
        return added;
    }

    function hasMentorship(email) {
        return userProducts(email).some(p => isMentorship(p.bot));
    }

    function mentorshipPlan(email) {
        const p = userProducts(email).find(p => isMentorship(p.bot));
        if (!p) return null;
        return {
            plan: p.bot === 'mentor-lifetime' ? 'Lifetime' : 'Monthly',
            started: p.date,
            nextRenewal: p.bot === 'mentor-lifetime' ? null : nextMonthly(p.date)
        };
    }

    function nextMonthly(iso) {
        const d = new Date(iso);
        while (d < new Date()) d.setMonth(d.getMonth() + 1);
        return d.toISOString();
    }

    function hydrateSession(sess) {
        if (!sess || !sess.email) return sess;
        const prods = userProducts(sess.email);
        sess.purchasedBots = prods.filter(p => !isMentorship(p.bot)).map(p => p.bot);
        const lastBot = prods.filter(p => !isMentorship(p.bot) && p.licenceKey).pop();
        if (lastBot) {
            sess.licence = sess.licence || lastBot.licenceKey;
            if (!sess.unlockedBots || !sess.unlockedBots.length) {
                const k = TIER_MAP[lastBot.bot] ? lastBot.bot : null;
                sess.unlockedBots = k ? [k] : [];
            }
            sess.tier = sess.tier || TIER_MAP[lastBot.bot] || null;
        }
        sess.isMember = hasMentorship(sess.email);
        return sess;
    }

    // ================= SESSION =================
    function login(email, password) {
        const user = findUser(email);
        if (!user) return { error: 'No account found with this email.' };
        if (!cmp(password, user.pass)) return { error: 'Incorrect password.' };
        const sess = hydrateSession({ name: user.name, email: user.email, role: user.role, licence: null, tier: null });
        write(K.session, sess);
        return { session: sess };
    }

    function register(name, email, password) {
        const res = createUser(name, email, password, 'client');
        if (res.error) return res;
        return login(email, password);
    }

    function provisionWithPassword(email, name, password) {
        // Seeds/updates a local account using an EXPLICIT password
        // (e.g. generated by the IMPERA webhook server and emailed to the buyer).
        const users = getUsers();
        let user = findUser(email);
        if (!user) {
            user = { id: uid(), name: name || 'Trader', email: String(email).toLowerCase(), pass: enc(password), role: 'client', createdAt: new Date().toISOString(), products: [] };
            users.push(user);
        } else {
            const i = users.indexOf(user);
            users[i].pass = enc(password);
            if (name) users[i].name = name;
        }
        saveUsers(users);
        return { email: String(email).toLowerCase(), password };
    }

    function autoProvision(name, email) {
        // Called after successful checkout — creates account if missing, returns credentials
        let user = findUser(email);
        let password = null;
        if (!user) {
            password = genPassword();
            createUser(name || 'Trader', email, password, 'client');
        } else {
            // existing account — generate a fresh temp password so buyer can always get in
            password = genPassword();
            const users = getUsers();
            user = users.find(u => u.email === user.email);
            user.pass = enc(password);
            saveUsers(users);
        }
        return { email: String(email).toLowerCase(), password };
    }

    const session = () => hydrateSession(read(K.session, null));
    const setSession = (s) => write(K.session, s);
    const clearSession = () => localStorage.removeItem(K.session);

    // ================= BOOKINGS =================
    // Every day available · hours easily adjustable here
    const SLOTS = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
                   '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
                   '20:00', '21:00'];

    const getBookings = () => read(K.bookings, []);
    const saveBookings = (b) => write(K.bookings, b);

    function addBooking(userEmail, userName, date, time, type) {
        const bookings = getBookings();
        if (bookings.find(b => b.date === date && b.time === time && b.status !== 'cancelled'))
            return { error: 'That slot has just been taken — please pick another.' };
        const booking = {
            id: uid(), userEmail, userName, date, time,
            type: type || '1:1 Mentorship Call',
            status: 'pending', zoom: '', notes: '',
            createdAt: new Date().toISOString()
        };
        bookings.push(booking);
        saveBookings(bookings);
        return { booking };
    }

    function updateBooking(id, patch) {
        const bookings = getBookings();
        const b = bookings.find(x => x.id === id);
        if (!b) return { error: 'Booking not found.' };
        Object.assign(b, patch);
        saveBookings(bookings);
        return { booking: b };
    }

    function deleteBooking(id) {
        saveBookings(getBookings().filter(b => b.id !== id));
    }

    function bookedSlots(date) {
        return getBookings()
            .filter(b => b.date === date && b.status !== 'cancelled')
            .map(b => b.time);
    }

    // ================= EXPORT =================
    function resetOwner() {
        // Restores the default owner account from the OWNER config above.
        const users = getUsers();
        const idx = users.findIndex(u => u.email.toLowerCase() === OWNER.email.toLowerCase());
        const owner = { id: uid(), name: OWNER.name, email: OWNER.email, pass: enc(OWNER.password), role: 'admin', createdAt: new Date().toISOString(), products: [] };
        if (idx >= 0) users[idx] = owner; else users.push(owner);
        saveUsers(users);
        return { email: OWNER.email, password: OWNER.password };
    }

    window.ImperaAuth = {
        K, OWNER, SLOTS,
        getUsers, findUser, createUser, genPassword,
        getPurchases, addPurchase, userProducts, hasMentorship, mentorshipPlan, isMentorship,
        hydrateSession, syncFromServer,
        login, register, autoProvision, provisionWithPassword, resetOwner,
        session, setSession, clearSession,
        getBookings, addBooking, updateBooking, deleteBooking, bookedSlots
    };
})();
