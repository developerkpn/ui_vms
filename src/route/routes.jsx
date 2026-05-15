import axios from "axios";
import { lazy } from "react";
import { Navigate, createBrowserRouter } from "react-router-dom";
import ESubmissionDir from "src/pages/dashboard/ESubmissionDir";
import FormVendorClient from "src/pages/dashboard/FormVendorClient";
const NavigateETender = lazy(() => import("src/pages/e-tender/NavigateETender"));
const OSTicketReqEdit = lazy(() => import("src/pages/reqedit/OSTicketReqEdit"));
const VendorLandingPage = lazy(() => import("src/pages/vendor/VendorLandingPage"));
const VendorUsers = lazy(() => import("src/pages/vendor/VendorUsers"));
const VerificationPage = lazy(() => import("src/pages/verification/VerificationPage"));
const DirectFormCreateNew = lazy(() => import("src/pages/create_new/DirectFormCreateNew"));
const DirectCoupaForm = lazy(() => import("src/pages/coupa/DirectCoupaForm"));
const LookupMaterials = lazy(() => import("src/pages/dashboard/LookupMaterials"));
const RequestMaterials = lazy(() => import("src/pages/dashboard/RequestMaterials"));
const Subgroups = lazy(() => import("src/pages/dashboard/SubgroupMaterial"));
const Materials = lazy(() => import("src/pages/dashboard/MaterialDetail"));
const SearchMaterials = lazy(() => import("src/pages/dashboard/SearchMaterials"));
const MaterialsAdministratorPlaceholder = lazy(
  () => import("src/pages/dashboard/MaterialsAdministratorPlaceholder")
);
const ReportTicketPosition = lazy(() => import("src/pages/report/ReportTicketPosition"));
const SingleRequestPage = lazy(() => import("src/pages/dashboard/SingleRequestPage"));
const AdminApprovalView = lazy(() => import("src/pages/dashboard/AdminApprovalView"));
// import ErrorPage from '../pages/ErrorPage';
// import Error404 from 'src/pages/Error404';
// import LoginPage from 'src/pages/LoginPage';
// import Dashboard from 'src/pages/dashboard/Dashboard';
// import ListTicket from 'src/pages/dashboard/ListTicket';
// import ListVendor from 'src/pages/dashboard/ListVendor';
// import ListReqStat from 'src/pages/dashboard/ListReqStat';
// import FormUserPage from 'src/pages/FormUserPage';
// import User from 'src/pages/dashboard/RefactorUser';
// import MenuAccessPage from 'src/pages/MenuAccessPage';
// import ListUserGroup from 'src/pages/dashboard/ListUserGroup';
// import RefactorFormVendorPage from 'src/pages/RefactorFormVendorPage';
// import ListMasterBank from 'src/pages/dashboard/ListMasterBank';
// import TicketInvalid from 'src/pages/TicketInvalid';
// import ResetPassword from 'src/pages/ResetPassword';

const FormReqEditDet = lazy(() => import("../pages/reqedit/FormReqEditDet"));
const ErrorPage = lazy(() => import("../pages/ErrorPage"));
const Error404 = lazy(() => import("src/pages/Error404"));
const LoginPage = lazy(() => import("src/pages/LoginPage"));
const Dashboard = lazy(() => import("src/pages/dashboard/Dashboard"));
const ListTicket = lazy(() => import("src/pages/dashboard/ListTicketv2"));
const ListVendor = lazy(() => import("src/pages/dashboard/ListVendor"));
const ListReqStat = lazy(() => import("src/pages/dashboard/ListReqStat"));
const FormUserPage = lazy(() => import("src/pages/FormUserPage"));
const User = lazy(() => import("src/pages/dashboard/RefactorUser"));
const MenuAccessPage = lazy(() => import("src/pages/MenuAccessPage"));
const ListUserGroup = lazy(() => import("src/pages/dashboard/ListUserGroup"));
const RefactorFormVendorPage = lazy(() => import("src/pages/RefactorFormVendorPage"));
const ListMasterBank = lazy(() => import("src/pages/dashboard/ListMasterBank"));
const TicketInvalid = lazy(() => import("src/pages/TicketInvalid"));
const ResetPassword = lazy(() => import("src/pages/ResetPassword"));
const ListCoupa = lazy(() => import("src/pages/coupa/ListPage"));

export const routes = createBrowserRouter([
  {
    path: "frm/:formtype/:token",
    element: <FormVendorClient />,
    children: [
      {
        path: "",
        element: <DirectFormCreateNew />,
        loader: async ({ params }) => {
          const checkValid = await axios.post(`${import.meta.env.VITE_URL_LOC}/ticket/checkvalid`, {
            ticket_id: params.token,
          });
          if (checkValid.status === 403) {
            throw new Response("Ticket is closed", { ticket_id: checkValid.data.message });
          }
          return {
            type: "new",
            token: params.token,
          };
        },
        errorElement: <TicketInvalid />,
      },
    ],
  },
  {
    path: "/",
    children: [
      { path: "404", element: <Error404 /> },
      { path: "", element: <Navigate to="login" /> },
    ],
  },
  {
    path: "login",
    element: <LoginPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: "resetpass",
    element: <ResetPassword />,
    errorElement: <ErrorPage />,
  },
  {
    path: "dashboard",
    element: <Dashboard />,
    loader: () => {
      return null;
    },
    errorElement: <ErrorPage />,
    children: [
      // {
      //   path: '',
      //   element: <VendorLandingPage />,
      // },
      {
        path: "form/:token",
        element: <DirectFormCreateNew />,
        loader: ({ params }) => {
          return {
            type: "form",
            token: params.token,
          };
        },
      },
      {
        path: "form-coupa/:id",
        element: <DirectCoupaForm />,
        loader: ({ params }) => {
          return {
            id: params.id,
          };
        },
      },
      {
        path: "ticket",
        element: <ListTicket />,
      },
      {
        path: "coupa",
        element: <ListCoupa />,
      },
      {
        path: "vendor",
        element: <ListVendor />,
      },
      {
        path: "ticketreqstat",
        element: <ListReqStat />,
      },
      {
        path: "users",
        element: <User />,
      },
      {
        path: "users/create",
        element: <FormUserPage />,
      },
      {
        path: "account/edit",
        element: <FormUserPage />,
      },
      {
        path: "securitygroup",
        element: <ListUserGroup />,
      },
      {
        path: "securitygroup/create",
        element: <MenuAccessPage />,
      },
      {
        path: "banks",
        element: <ListMasterBank />,
      },
      {
        path: "vendorverif",
        element: <VerificationPage />,
      },
      {
        path: "usrven",
        element: <VendorUsers />,
      },
      {
        path: "editreq/form",
        element: <FormReqEditDet />,
      },
      {
        path: "editreq",
        element: <OSTicketReqEdit />,
      },
      {
        path: "esubmission",
        element: <ESubmissionDir />,
      },
      {
        path: "materials/lookup",
        element: <LookupMaterials />,
      },
      {
        path: "materials/request",
        element: <RequestMaterials />,
      },
      {
        path: "materials/approvals",
        element: <Navigate to="/dashboard/materials/approval" replace />,
      },
      {
        path: "materials/approval",
        element: <AdminApprovalView />,
      },
      {
        path: "materials/administrator",
        element: <MaterialsAdministratorPlaceholder />,
      },
      {
        path: "administrator/approval",
        element: <Navigate to="/dashboard/materials/approval" replace />,
      },
      {
        path: "materials/request/single",
        element: <SingleRequestPage mode="single" />,
      },
      {
        path: "materials/request/mass",
        element: <SingleRequestPage mode="mass" />,
      },
      {
        path: "subgroups/:groupId",
        element: <Subgroups />,
      },
      {
        path: "materials/:subgroupId",
        element: <Materials />,
      },
      {
        path: "materials/search",
        element: <SearchMaterials />,
      },
      {
        path: "etender/multi",
        element: <NavigateETender type="recap" />,
      },
      {
        path: "etender/single",
        element: <NavigateETender type="scalling" />,
      },
      {
        path: "report/ticpos",
        element: <ReportTicketPosition />,
      },
    ],
  },
  {
    path: "*",
    element: <Navigate to="login" />,
  },
  {
    path: "invalidticket",
    element: <TicketInvalid />,
    errorElement: <ErrorPage />,
  },
]);
