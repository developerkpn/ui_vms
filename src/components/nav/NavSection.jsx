import NavItem from './NavItem';
import NavHead from './NavHead';
import { List } from '@mui/material';
import Collapse from '@mui/material/Collapse';
import NavCollapse from './NavCollapse';
import { useSession } from 'src/provider/sessionProvider';
import React from 'react';

function NavSection({ menu, collapsemen, navmen, onUpNavCol, onUpNavMenu }) {
  const onClickNavHead = (item) => {
    onUpNavCol(item);
  };
  const { getPermission, getMenu } = useSession();
  return (
    <List>
      {Object.values(getMenu()).map((item) => {
        if (getPermission(item.text)?.read === true) {
          return (
            <div key={`div-${item.key}`}>
              <NavHead
                key={item.key}
                keyhead={item.key}
                text={item.text}
                icon={item.icon}
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
                    if (getPermission(child.text)?.read)
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
