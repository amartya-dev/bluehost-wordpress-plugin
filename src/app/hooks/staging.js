import apiFetch from '@wordpress/api-fetch';
import {useEffect, useState} from '@wordpress/element';
import {__} from '@wordpress/i18n';

/**
 * Staging functionality.
 *
 * @returns {Array}
 */
export default function useStaging() {

    /**
     * The creation date of the staging environment.
     *
     * @var {string}
     */
    const [creationDate, setCreationDate] = useState(null);

    /**
     * Whether or not we are on the production environment.
     *
     * @var {Boolean}
     */
    const [isProduction, setIsProduction] = useState(null);

    /**
     * The notice to be displayed to the user.
     *
     * @var {String}
     */
    const [notice, setNotice] = useState(null);

    /**
     * Whether or not a staging environment exists.
     *
     * @var {Boolean}
     */
    const [hasStaging, setHasStaging] = useState(null);

    /**
     * Whether or not a staging environment is being created.
     *
     * @var {Boolean}
     */
    const [isCreatingStaging, setIsCreatingStaging] = useState(false);

    /**
     * Whether or not we have hit an error state.
     *
     * @var {Boolean}
     */
    const [isError, setIsError] = useState(false);

    /**
     * Whether or not we are actively making an HTTP request.
     *
     * @var {Boolean}
     */
    const [isLoading, setIsLoading] = useState(false);

    /**
     * The production environment directory.
     *
     * @var {string}
     */
    const [productionDir, setProductionDir] = useState(null);

    /**
     * The production thumbnail URL.
     *
     * @var {string}
     */
    const [productionThumbnailUrl, setProductionThumbnailUrl] = useState(null);

    /**
     * The production environment URL.
     *
     * @var {string}
     */
    const [productionUrl, setProductionUrl] = useState(null);

    /**
     * The staging environment directory.
     *
     * @var {string}
     */
    const [stagingDir, setStagingDir] = useState(null);

    /**
     * The staging thumbnail URL.
     *
     * @var {string}
     */
    const [stagingThumbnailUrl, setStagingThumbnailUrl] = useState(null);

    /**
     * The staging environment URL.
     *
     * @var {string}
     */
    const [stagingUrl, setStagingUrl] = useState(null);

    /**
     * Set when switching between environments.
     *
     * @var {String} Can be one of 'staging' or 'production'.
     */
    const [switchingTo, setSwitchingTo] = useState('');

    /**
     * Fallback error message.
     *
     * @type {String}
     */
    const unknownErrorMsg = __('An unknown error has occurred.', 'bluehost-wordpress-plugin');

    /**
     * Call the WordPress REST API.
     *
     * @param options
     * @returns {Promise<null>}
     */
    const callApi = async (options) => {

        setIsError(false);
        setIsLoading(true);
        setNotice(null);

        try {
            const response = await apiFetch(options);

            if (response.hasOwnProperty('status') && response.status === 'error') {
                throw new Error(response.message);
            }

            setIsLoading(false);
            return response;

        } catch (error) {
            setIsLoading(false);
            setIsError(true);
            setNotice((typeof error === 'object' ? error.message : error) || unknownErrorMsg);
            return null;
        }
    };

    const setup = (response) => {
        if (response.hasOwnProperty('stagingExists')) {
            setHasStaging(response.stagingExists);
        }
        if (response.hasOwnProperty('currentEnvironment')) {
            setIsProduction(response.currentEnvironment === 'production');
        }
        if (response.hasOwnProperty('productionDir')) {
            setProductionDir(response.productionDir);
        }
        if (response.hasOwnProperty('productionThumbnailUrl')) {
            setProductionThumbnailUrl(response.productionThumbnailUrl);
        }
        if (response.hasOwnProperty('productionUrl')) {
            setProductionUrl(response.productionUrl);
        }
        if (response.hasOwnProperty('stagingDir')) {
            setStagingDir(response.stagingDir);
        }
        if (response.hasOwnProperty('stagingThumbnailUrl')) {
            setStagingThumbnailUrl(response.stagingThumbnailUrl);
        }
        if (response.hasOwnProperty('stagingUrl')) {
            setStagingUrl(response.stagingUrl);
        }
        if (response.hasOwnProperty('creationDate')) {
            setCreationDate(response.creationDate);
        }
    };

    useEffect(() => {
        // Set staging details.
        callApi({path: '/bluehost/v1/staging'})
            .then(setup);
    }, []);

    /**
     * Create staging environment.
     */
    async function createEnv() {
        setIsCreatingStaging(true);
        const response = await callApi({path: '/bluehost/v1/staging', method: 'POST'});
        if (response) {
            setup(response);
            setNotice(response.message);
            setIsError(response.status === 'error');
        }
        setIsCreatingStaging(false);
    }

    /**
     * Delete the staging environment.
     */
    async function deleteEnv() {
        const response = await callApi({path: '/bluehost/v1/staging', method: 'DELETE'});
        if (response) {
            setHasStaging(false);
            setNotice(__('Staging website destroyed.', 'bluehost-wordpress-plugin'));
            if (!isProduction) {
                switchToEnv('production');
            }
        }
    }

    /**
     * Switch between environments.
     *
     * @param {String} env
     */
    async function switchToEnv(env) {
        setSwitchingTo(env);
        const response = await callApi({path: `/bluehost/v1/staging/switch-to?env=${env}`});
        if (response && response.hasOwnProperty('load_page')) {
            window.location.href = response.load_page;
        }
    }

    /**
     * Clone the production environment to staging.
     */
    async function cloneEnv() {
        const response = await callApi({path: '/bluehost/v1/staging/clone', method: 'POST'});
        if (response) {
            setNotice(__('Website cloned successfully.', 'bluehost-wordpress-plugin'));
        }
    }

    /**
     * Deploy changes from staging to production.
     *
     * @param {String} type One of 'all', 'files', or 'db'
     */
    async function deployChanges(type = 'all') {
        const response = await callApi({path: `/bluehost/v1/staging/deploy?type=${type}`, method: 'POST'});
        if (response) {
            setNotice(__('Changes deployed successfully.', 'bluehost-wordpress-plugin'));
        }
    }

    return [
        {
            creationDate,
            hasStaging,
            isCreatingStaging,
            isError,
            isProduction,
            isLoading,
            notice,
            productionDir,
            productionThumbnailUrl,
            productionUrl,
            stagingDir,
            stagingThumbnailUrl,
            stagingUrl,
            switchingTo
        }, {
            cloneEnv,
            createEnv,
            deleteEnv,
            deployChanges,
            setNotice,
            switchToEnv
        }
    ];
}