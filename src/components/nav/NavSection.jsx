import NavItem from './NavItem';
import NavHead from './NavHead';
import { List } from '@mui/material';
import Collapse from '@mui/material/Collapse';
import NavCollapse from './NavCollapse';
import usePermissionStore from 'src/store/userPermissionStore';
import useMenuStore from 'src/store/useMenuStore';
import React from 'react';

function NavSection({ menu, collapsemen, navmen, onUpNavCol, onUpNavMenu }) {
  const onClickNavHead = (item) => {
    onUpNavCol(item);
  };
  const menu_sess = useMenuStore((state) => state.menu);
  const permission = usePermissionStore((state) => state.permission);
  return (
    <List>
      {Object.values(menu_sess).map((item) => {
        if (permission[item.text]?.read === true) {
          const headUrl = item.url || (item.children?.length === 1 ? item.children[0].url : "");

          return (
            <div key={`div-${item.key}`}>
              <NavHead
                key={item.key}
                keyhead={item.key}
                text={item.text}
                icon={item.icon}
                url={headUrl}
                upNav={onClickNavHead}
                curstate={collapsemen}
              />
              {/* <Collapse in={false} timeout="auto" unmountOnExit>
                <List>
                  {item.children.map((child) => {
                    return <NavItem key={child.key} keynav={child.key} text={child.text} url={child.url} />;
                  })}
                </List>
              </Collapse> */}
              <NavCollapse parent={item.key} curstate={collapsemen}>
                <List>
                  {item.children.map((child) => {
                    if (permission[child.text]?.read)
                      return (
                        <NavItem
                          key={child.key}
                          keynav={child.key}
                          text={child.text}
                          url={child.url}
                          upNavMenu={onUpNavMenu}
                          curstate={navmen}
                        />
                      );
                    else {
                      return <></>;
                    }
                  })}
                </List>
              </NavCollapse>
            </div>
          );
        } else {
          return <></>;
        }
      })}
    </List>
  );
}

export default React.memo(NavSection);
